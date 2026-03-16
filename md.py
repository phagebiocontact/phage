import modal
from modal import Volume as vol,Dict,Image as img,App
import time
import json
import math
import struct
import zlib
vl=vol.from_name("md-storage",create_if_missing=True)
jc=Dict.from_name("md-job-control",create_if_missing=True)
image = img.debian_slim(python_version="3.12").micromamba().micromamba_install("openmm","cuda-version=12.8", "openmmforcefields", "openff-toolkit", "openff-forcefields", "mdtraj", "mdanalysis", "ambertools", "rdkit", "pdbfixer", "matplotlib", "seaborn", "numpy", "scipy", "polars", "fastapi", "parmed", "loguru", channels=["conda-forge"])
app=modal.App(name="md")

PACKET_MAGIC = 0x50484731
PACKET_HEADER_BYTES = 16
PACKET_STATUS = 1
PACKET_LOGS = 2
PACKET_INIT = 3
PACKET_FRAME = 4
PACKET_END = 5
PACKET_ERROR = 6
MAX_STREAM_FRAMES = 100
RING_BUFFER_BYTES = 64 * 1024 * 1024


def build_packet(kind, header=None, payload=b"", compress_payload=False):
    header = header or {}
    body = zlib.compress(payload) if compress_payload and payload else payload
    if compress_payload and payload:
        header = {**header, "compressed": True}
    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    prefix = struct.pack("<IHHII", PACKET_MAGIC, 1, kind, len(header_bytes), len(body))
    return prefix + header_bytes + body


def status_packet(state):
    return build_packet(PACKET_STATUS, state, b"")


def logs_packet(text_chunk, start_line=0):
    return build_packet(PACKET_LOGS, {"startLine": start_line}, text_chunk.encode("utf-8"))


def error_packet(message):
    return build_packet(PACKET_ERROR, {}, str(message).encode("utf-8"))


def dssp_codes(dssp_frame):
    mapping = {"C": 0.0, "H": 1.0, "E": 2.0}
    return [mapping.get(str(code), 0.0) for code in dssp_frame]


def coords_from_pdb_bytes(pdb_bytes):
    import numpy as np
    coords = []
    for line in pdb_bytes.decode("utf-8", errors="ignore").splitlines():
        if line.startswith(("ATOM", "HETATM")):
            coords.extend([
                float(line[30:38]),
                float(line[38:46]),
                float(line[46:54]),
            ])
    return np.asarray(coords, dtype=np.float32)


def frame_packet(slot_index, source_frame, time_ns, progress, coords_angstrom, rmsf_vals, dssp_vals, scalars):
    import numpy as np
    coords = np.asarray(coords_angstrom, dtype=np.float32).reshape(-1)
    rmsf = np.asarray(rmsf_vals or [], dtype=np.float32)
    dssp = np.asarray(dssp_vals or [], dtype=np.float32)
    payload = np.concatenate([coords, rmsf, dssp]).astype(np.float32, copy=False)
    sections = {
        "coords": [0, int(coords.size)],
        "rmsf": [int(coords.size), int(coords.size + rmsf.size)],
        "dssp": [int(coords.size + rmsf.size), int(coords.size + rmsf.size + dssp.size)],
    }
    header = {
        "slotIndex": int(slot_index),
        "sourceFrame": int(source_frame),
        "timeNs": float(time_ns),
        "progress": float(progress),
        "scalars": {k: float(v) for k, v in scalars.items()},
        "sections": sections,
    }
    return build_packet(PACKET_FRAME, header, payload.tobytes(), compress_payload=True)


def init_packet(pdb_bytes, atom_count, slot_count, residue_count):
    return build_packet(PACKET_INIT, {
        "atomCount": int(atom_count),
        "slotCount": int(slot_count),
        "residueCount": int(residue_count),
        "ringBufferSuggested": (atom_count * max(slot_count, 1) * 12) > RING_BUFFER_BYTES,
        "topologyFormat": "pdb",
    }, pdb_bytes, compress_payload=True)


def unwrap_relative_to_previous(current_positions_nm, previous_positions_nm, box_vectors_nm):
    import numpy as np
    if previous_positions_nm is None or box_vectors_nm is None:
        return current_positions_nm
    try:
        box = np.asarray(box_vectors_nm, dtype=np.float32)
        if box.shape != (3, 3):
            return current_positions_nm
        inv_box = np.linalg.inv(box)
        delta_frac = (current_positions_nm - previous_positions_nm) @ inv_box
        delta_frac -= np.round(delta_frac)
        return previous_positions_nm + (delta_frac @ box)
    except Exception:
        return current_positions_nm


def sample_frame_indices(total_frames, max_frames=MAX_STREAM_FRAMES):
    if total_frames <= max_frames:
        return list(range(total_frames))
    stride = max(1, math.ceil(total_frames / max_frames))
    indices = list(range(0, total_frames, stride))
    if indices[-1] != total_frames - 1:
        indices[-1] = total_frames - 1
    return indices[:max_frames]

def run_rmsd(pdb_file, xtc_file, p_time):
    try:
        import MDAnalysis as mda
        from MDAnalysis.analysis import rms
        import numpy as np
        import polars as pl
        from loguru import logger
        universe = mda.Universe(pdb_file, xtc_file)
        logger.info("[RMSD] Starting calculation")
        r = rms.RMSD(universe, select='backbone', groupselections=['backbone'], ref_frame=0)
        r.run()
        vals = r.results.rmsd[:, 2]
        df = pl.DataFrame({'Time': np.arange(len(vals)) * (p_time / len(vals)), 'RMSD': vals})
        t_list = [{"frame": i, "time": float(i * p_time / len(vals)), "value": float(v)} for i, v in enumerate(vals)]
        logger.info(f"[RMSD] Completed successfully, {len(vals)} data points, max={vals.max():.2f} Å")
        return ("rmsd", t_list, df)
    except Exception as e:
        import traceback
        print(f"[RMSD] Analysis failed: {e}\n{traceback.format_exc()}")
        return ("rmsd", None, None)

def run_rmsf(pdb_file, xtc_file, p_time):
    try:
        import MDAnalysis as mda
        from MDAnalysis.analysis import align
        from MDAnalysis.analysis.rms import RMSF
        import numpy as np
        import polars as pl
        from loguru import logger
        universe = mda.Universe(pdb_file, xtc_file)
        logger.info("[RMSF] Starting calculation")
        sel = 'protein and name CA'
        align.AlignTraj(universe, universe, select=sel, in_memory=True).run()
        ref_avg = align.AverageStructure(universe, universe, select=sel, ref_frame=0).run().results.universe
        align.AlignTraj(universe, ref_avg, select=sel, in_memory=True).run()
        vals = RMSF(universe.select_atoms(sel)).run().results.rmsf
        data = [{"residue": int(i), "value": float(v)} for i, v in enumerate(vals)]
        df = pl.DataFrame({"Residue": np.arange(len(vals)), "RMSF": vals})
        logger.info(f"[RMSF] Completed successfully, {len(vals)} residues, max={vals.max():.2f} Å")
        return ("rmsf", data, df)
    except Exception as e:
        import traceback
        print(f"[RMSF] Analysis failed: {e}\n{traceback.format_exc()}")
        return ("rmsf", None, None)

def run_rg(pdb_file, xtc_file, p_time):
    try:
        import mdtraj as md
        import numpy as np
        import polars as pl
        from loguru import logger
        traj = md.load(xtc_file, top=pdb_file)
        logger.info("[Rg] Starting calculation")
        rg = md.compute_rg(traj)
        df = pl.DataFrame({"Time": np.arange(len(rg)) * (p_time / len(rg)), "Radius of gyration": rg})
        t_list = [{"frame": i, "time": float(i * p_time / len(rg)), "value": float(v)} for i, v in enumerate(rg)]
        logger.info(f"[Rg] Completed successfully, {len(rg)} data points")
        return ("radiusOfGyration", t_list, df)
    except Exception as e:
        import traceback
        print(f"[Rg] Analysis failed: {e}\n{traceback.format_exc()}")
        return ("radiusOfGyration", None, None)

def run_ligand_rmsd(pdb_file, xtc_file, p_time):
    try:
        import mdtraj as md
        import numpy as np
        import polars as pl
        from loguru import logger
        traj = md.load(xtc_file, top=pdb_file)
        ligand_indices = traj.topology.select("resname UNL or not protein and not water and not (name NA or name CL or name K or name CA or name MG)")
        if len(ligand_indices) == 0:
            return ("ligandRmsd", [], pl.DataFrame({"Time": [], "Ligand RMSD": []}))
        logger.info("[Ligand RMSD] Starting calculation")
        rmsd = md.rmsd(traj.atom_slice(ligand_indices), traj.atom_slice(ligand_indices), 0) * 10.0
        df = pl.DataFrame({"Time": np.arange(len(rmsd)) * (p_time / len(rmsd)), "Ligand RMSD": rmsd})
        t_list = [{"frame": i, "time": float(i * p_time / len(rmsd)), "value": float(v)} for i, v in enumerate(rmsd)]
        logger.info(f"[Ligand RMSD] Completed successfully, {len(rmsd)} data points")
        return ("ligandRmsd", t_list, df)
    except Exception as e:
        import traceback
        print(f"[Ligand RMSD] Analysis failed: {e}\n{traceback.format_exc()}")
        return ("ligandRmsd", None, None)

def run_dssp(pdb_file, xtc_file, p_time):
    try:
        import mdtraj as md
        import numpy as np
        import polars as pl
        from loguru import logger
        traj = md.load(xtc_file, top=pdb_file)
        logger.info("[DSSP] Starting calculation")
        dssp = md.compute_dssp(traj)
        ss_df = pl.DataFrame({
            'Time': np.arange(len(dssp)) * (p_time / len(dssp)),
            'Helix': (dssp == 'H').sum(axis=1),
            'Sheet': (dssp == 'E').sum(axis=1),
            'Coil': (dssp == 'C').sum(axis=1)
        })
        data = []
        for i, d in enumerate(dssp):
            data.append({
                "frame": i,
                "helix": int((d == 'H').sum()),
                "sheet": int((d == 'E').sum()),
                "coil": int((d == 'C').sum())
            })
        logger.info(f"[DSSP] Completed successfully, {len(dssp)} frames")
        return ("dssp", data, ss_df)
    except Exception as e:
        import traceback
        print(f"[DSSP] Analysis failed: {e}\n{traceback.format_exc()}")
        return ("dssp", None, None)

@app.function(image=image,cpu=8,gpu="T4",volumes={"/data":vl},scaledown_window=300,timeout=86400,retries=10,enable_memory_snapshot=True,experimental_options={"enable_gpu_snapshot":True})
def md(job_id,protein_bytes,ligand_bytes,config_json):
    from openmm.app import PDBFile,Modeller,PME,HBonds,Simulation,StateDataReporter,XTCReporter
    from openmmforcefields.generators import SystemGenerator
    from openff.toolkit.topology import Molecule
    from openmm import LangevinMiddleIntegrator as lmi,Platform,MonteCarloBarostat
    from openmm import unit as omm_unit
    import os
    import MDAnalysis as mda
    from MDAnalysis.analysis import rms
    from MDAnalysis.analysis.rms import RMSF
    import mdtraj as md
    import numpy as np
    import matplotlib.pyplot as plt
    import seaborn as sns
    import polars as pl
    import tarfile
    import json
    import hmac
    import hashlib
    import urllib.request
    from pdbfixer import PDBFixer
    from loguru import logger
    from concurrent.futures import ThreadPoolExecutor
    import time
    start_time = time.time()
    if job_id not in jc:
        jc[job_id] = {"status": "queued", "paused": False, "cancelled": False, "progress_percent": 0}

    def check_job_status():
        state = jc[job_id]
        if state.get("cancelled"):
            logger.warning(f"Job {job_id} cancelled by user")
            raise Exception("Job cancelled")
        while state.get("paused"):
            time.sleep(2)
            state = jc[job_id]
            if state.get("cancelled"):
                raise Exception("Job cancelled")

    def update_status(step, progress, details="", analysis_data=None, speed=0.0):
        elapsed = time.time() - start_time
        current_state = jc[job_id]
        status_update = {
            "status": "running",
            "current_step": step,
            "progress_percent": progress,
            "time_elapsed_seconds": round(elapsed, 2),
            "details": details,
            "speed_ns_per_day": round(speed, 2),
            "paused": current_state.get("paused", False),
            "cancelled": current_state.get("cancelled", False)
        }
        if analysis_data:
            status_update["analysis_data"] = analysis_data
        jc[job_id] = status_update

    def notify_webhook(payload, job_id=None, wait_for_callback=True):
        webhook_url = os.getenv("SIM_WEBHOOK_URL")
        if not webhook_url:
            return
        try:
            secret = os.getenv("SIM_WEBHOOK_SECRET")
            # Include callback URL so Convex can notify us when done
            callback_base = os.getenv("MODAL_CALLBACK_URL", "")
            if callback_base and job_id:
                payload["_callback_url"] = f"{callback_base}/jobs/{job_id}/mirror-complete"
            
            body = json.dumps(payload, separators=(",", ":"), sort_keys=True)
            timestamp = str(int(time.time()))
            headers = {
                "Content-Type": "application/json",
            }
            if secret:
                signature = hmac.new(
                    secret.encode("utf-8"),
                    f"{timestamp}.{body}".encode("utf-8"),
                    hashlib.sha256,
                ).hexdigest()
                headers["x-simulation-webhook-timestamp"] = timestamp
                headers["x-simulation-webhook-signature"] = signature
            req = urllib.request.Request(
                webhook_url,
                data=body.encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                response_data = response.read().decode()
                logger.info(f"Webhook sent, response: {response_data}")
            
            # Wait for Convex callback when done mirroring
            if wait_for_callback and payload.get("status") == "completed":
                job_id = job_id or payload.get("job_id")
                logger.info(f"Waiting for Convex mirror callback for job {job_id}...")
                # The webhook handler will set this flag when callback received
                jc[f"{job_id}_mirror_complete"] = False
                max_wait = 120
                waited = 0
                while waited < max_wait:
                    time.sleep(2)
                    waited += 2
                    if jc.get(f"{job_id}_mirror_complete"):
                        logger.info(f"Mirror complete callback received for job {job_id}")
                        break
                    if waited % 10 == 0:
                        logger.info(f"Still waiting for mirror callback... ({waited}s elapsed)")
                if waited >= max_wait:
                    logger.warning(f"Mirror callback timeout for job {job_id}, proceeding anyway")
        except Exception as webhook_err:
            logger.warning(f"Webhook notify failed for {job_id}: {webhook_err}")

    try:
        check_job_status()
        update_status("Initializing", 0, "Starting MD simulation job")
        logger.info(f"Starting MD job {job_id}")
        job_dir=f"/data/{job_id}"
        os.makedirs(job_dir,exist_ok=True)
        os.chdir(job_dir)
        logger.add("simulation.log")
        logger.info(f"Working directory: {job_dir}")
        config=json.loads(config_json)
        logger.info(f"Configuration loaded: {config}")
        
        update_status("Loading Files", 2, "Writing input files")
        with open ("protein.pdb","wb") as f:
            f.write(protein_bytes)
        
        ligand_mol = None
        if ligand_bytes:
            with open ("ligand.sdf","wb") as f:
                f.write(ligand_bytes)
            ligand_mol = Molecule.from_file("ligand.sdf", file_format="sdf")
            logger.info(f"Ligand loaded with {ligand_mol.n_atoms} atoms")
        
        update_status("Preparing System", 5, "Fixing protein structure with PDBFixer")
        logger.info("Fixing protein structure with PDBFixer")
        fixer = PDBFixer("protein.pdb")
        fixer.findNonstandardResidues()
        fixer.replaceNonstandardResidues()
        fixer.removeHeterogens(keepWater=False)
        fixer.findMissingResidues()
        fixer.findMissingAtoms()
        fixer.addMissingAtoms()
        fixer.addMissingHydrogens(pH=config.get("ph", 7.4))
        
        with open("protein_fixed.pdb", "w") as f:
            PDBFile.writeFile(fixer.topology, fixer.positions, f)
        
        mod = Modeller(fixer.topology, fixer.positions)
        
        update_status("Preparing System", 10, "Setting up forcefields and system generator")
        FF_MAP = {
            "amber19-default": ["amber19-all.xml"],
            "amber19": ["amber19-all.xml"],
            "charmm36m": ["charmm36m.xml"]
        }
        WATER_MAP = {
            "opc-default": "amber19/opc.xml",
            "opc": "amber19/opc.xml",
            "charmm-modified-tip3p": "charmm36/water.xml"
        }
        DEFAULT_PAIRING = {
            "amber19-default": "opc-default",
            "amber19": "opc",
            "charmm36m": "charmm-modified-tip3p"
        }
        LIGAND_FF_MAP = {"openff-default": "openff-2.3.0", "gaff2": "gaff-2.11"}

        ff_key = config.get("forcefield", "amber19")
        ff_xmls = FF_MAP.get(ff_key, ["amber19-all.xml"])
        solvent_model = config.get("solvation_model") or DEFAULT_PAIRING.get(ff_key, "opc")
        ff_xmls.append(WATER_MAP.get(solvent_model, "amber19/opc.xml"))
        ligand_ff = LIGAND_FF_MAP.get(config.get("ligand_forcefield", "openff-default"), "openff-2.3.0")
        hmr = config.get("hmr", True)
        hydrogen_mass = 3.024 * omm_unit.amu if hmr else None
        
        system_generator = SystemGenerator(
            forcefields=ff_xmls,
            small_molecule_forcefield=ligand_ff,
            molecules=[ligand_mol] if ligand_mol else [],
            forcefield_kwargs={"constraints": HBonds, "rigidWater": True, "removeCMMotion": True, "hydrogenMass": hydrogen_mass},
            periodic_forcefield_kwargs={"nonbondedMethod": PME, "nonbondedCutoff": config.get("nonbonded_cutoff_nm", 1.0) * omm_unit.nanometer}
        )
        
        ligand_indices = np.asarray([], dtype=int)
        if ligand_mol:
            update_status("Preparing System", 15, "Adding ligand to system")
            ligand_start = mod.topology.getNumAtoms()
            lig_off_top = ligand_mol.to_topology().to_openmm()
            mod.add(lig_off_top, ligand_mol.conformers[0].to_openmm())
            ligand_indices = np.arange(ligand_start, ligand_start + lig_off_top.getNumAtoms(), dtype=int)
            logger.info("Ligand added to system")

        update_status("Preparing System", 18, f"Adding solvent ({solvent_model})")

        WATER_NAME_MAP = {
            "opc-default": "tip4pew",
            "opc": "tip4pew",
            "charmm-modified-tip3p": "tip3p"
        }

        mod.addSolvent(
            system_generator.forcefield,
            model=WATER_NAME_MAP.get(solvent_model, "tip4pew"),
            padding=config.get("padding_nm", 1.0) * omm_unit.nanometer,
            ionicStrength=config.get("ionic_strength_mol", 0.15) * omm_unit.molar,
            boxShape='dodecahedron',
            positiveIon=config.get("positive_ion", "Na+"),
            negativeIon=config.get("negative_ion", "Cl-")
        )
        box_nm = np.asarray(mod.topology.getPeriodicBoxVectors().value_in_unit(omm_unit.nanometer), dtype=float)
        all_pos = np.asarray(mod.positions.value_in_unit(omm_unit.nanometer), dtype=float)
        box_center = 0.5 * np.diag(box_nm)
        shift = box_center - all_pos[:fixer.topology.getNumAtoms()].mean(axis=0)
        mod.positions = omm_unit.Quantity(all_pos + shift, omm_unit.nanometer)
        logger.info(f"Solvated system: {mod.topology.getNumAtoms()} total atoms, protein centered at box center")

        system = system_generator.create_system(mod.topology, molecules=[ligand_mol] if ligand_mol else [])
        
        dt = (4.0 if hmr else config.get("timestep_fs", 2.0)) * omm_unit.femtoseconds
        temp = config.get("temperature_K", 300.0) * omm_unit.kelvin
        pressure = config.get("pressure_bar", 1.0) * omm_unit.bar
        barostat = MonteCarloBarostat(pressure, temp, config.get("barostat_frequency", 25))
        system.addForce(barostat)
        
        integrator = lmi(temp, 1.0/omm_unit.picosecond, dt)
        dt_fs = dt.value_in_unit(omm_unit.femtoseconds)
        snapshot_interval_steps = max(1, int(round(10000.0 / dt_fs)))
        
        try:
            platform = Platform.getPlatformByName('CUDA')
            properties = {'Precision': 'mixed'}
        except:
            platform = Platform.getPlatformByName('OpenCL')
            properties = {}
            
        simulation = Simulation(mod.topology, system, integrator, platform, properties)
        simulation.context.setPositions(mod.positions)
        simulation.reporters.append(StateDataReporter("energy.csv", 5000, step=True, time=True, potentialEnergy=True, kineticEnergy=True, totalEnergy=True, temperature=True, speed=True))
        
        update_status("Minimizing", 20, "Running energy minimization")
        simulation.minimizeEnergy(maxIterations=config.get("minimization_max_steps", 1000))
        
        equil_time = config.get("equilibration_time_ns", 10.0)
        phases = [
            ("nvt_equil", equil_time * 0.1),
            ("npt_equil", equil_time * 0.9),
            ("production", config.get("production_time_ns", 10.0))
        ]

        frame_count = 0
        equil_reporter = None
        reference_traj = None
        backbone_indices = None
        ca_indices = np.asarray([], dtype=int)
        ref_xyz_bb = None
        ref_xyz_ligand = None
        ref_xyz_ca = None
        prev_display_positions_nm = None

        # Background thread pool for per-chunk IO/analysis so GPU never waits
        _live_executor = ThreadPoolExecutor(max_workers=2)
        _pending_live_future = None
        _live_analysis_buf = []
        _frame_packets = []
        live_stream_slots = max(1, math.ceil((config.get("production_time_ns", 10.0) * 100.0) / MAX_STREAM_FRAMES))
        live_slot_target = max(1, math.ceil((config.get("production_time_ns", 10.0) * 100.0) / live_stream_slots))
        jc[f"{job_id}_stream_frames"] = []
        jc[f"{job_id}_stream_slot_count"] = live_slot_target

        def _live_worker(positions_nm, previous_display_positions_nm, box_vectors_nm, omm_topology, md_topology, ref_xyz_bb, bb_idx, ligand_idx, ref_xyz_lig, rmsf_vals, snap_file, packet_file, slot_index, source_frame,
                         time_ns_done, progress, read_energy):
            """CPU/IO work that runs off the GPU main thread."""
            try:
                import mdtraj as _md
                import numpy as _np
                # Build snap traj directly from positions array — no PDB write/read needed for analysis
                snap_traj = _md.Trajectory(positions_nm[_np.newaxis], md_topology)
                try:
                    snap_traj.image_molecules(inplace=True)
                except Exception:
                    pass
                imaged_positions_nm = snap_traj.xyz[0].astype(_np.float32, copy=False)
                display_positions_nm = unwrap_relative_to_previous(
                    imaged_positions_nm,
                    previous_display_positions_nm,
                    box_vectors_nm,
                ).astype(_np.float32, copy=False)
                rmsd_val = float(_np.sqrt(_np.mean(_np.sum((imaged_positions_nm[bb_idx] - ref_xyz_bb) ** 2, axis=1)))) * 10.0
                rg_val = float(_md.compute_rg(snap_traj)[0] * 10.0)
                dssp_arr = _md.compute_dssp(snap_traj)[0]
                helix_count = int((dssp_arr == 'H').sum())
                sheet_count = int((dssp_arr == 'E').sum())
                coil_count = int((dssp_arr == 'C').sum())
                ligand_rmsd = 0.0
                if len(ligand_idx) and ref_xyz_lig is not None:
                    ligand_rmsd = float(_np.sqrt(_np.mean(_np.sum((imaged_positions_nm[ligand_idx] - ref_xyz_lig) ** 2, axis=1)))) * 10.0

                pot_e = kin_e = tot_e = None
                if read_energy and os.path.exists("energy.csv"):
                    try:
                        with open("energy.csv") as fe:
                            erows = fe.readlines()
                        if len(erows) > 1:
                            last_row = erows[-1].strip().split(',')
                            pot_e = float(last_row[2])
                            kin_e = float(last_row[3])
                            tot_e = float(last_row[4])
                    except Exception:
                        pass

                apoint = {
                    "frame": slot_index,
                    "source_frame": source_frame,
                    "time_ns": round(time_ns_done, 4),
                    "backbone_rmsd": round(rmsd_val, 4),
                    "ligand_rmsd": round(ligand_rmsd, 4),
                    "radius_of_gyration": round(rg_val, 4),
                    "helix": helix_count, "sheet": sheet_count, "coil": coil_count,
                    "rmsf": [round(float(v), 4) for v in rmsf_vals],
                    "dssp": dssp_codes(dssp_arr),
                }
                if pot_e is not None:
                    apoint.update({
                        "potential_energy": round(pot_e, 2),
                        "kinetic_energy": round(kin_e, 2),
                        "total_energy": round(tot_e, 2),
                    })

                from openmm.app import PDBFile as _PDB
                import openmm.unit as _u
                pos_q = _u.Quantity(display_positions_nm, _u.nanometer)
                with open(snap_file, "w") as _f:
                    _PDB.writeFile(omm_topology, pos_q, _f)
                packet = frame_packet(
                    slot_index=slot_index,
                    source_frame=source_frame,
                    time_ns=time_ns_done,
                    progress=progress,
                    coords_angstrom=(display_positions_nm * 10.0).astype(_np.float32),
                    rmsf_vals=apoint["rmsf"],
                    dssp_vals=apoint["dssp"],
                    scalars={
                        "frame": apoint["frame"],
                        "backbone_rmsd": apoint["backbone_rmsd"],
                        "ligand_rmsd": apoint["ligand_rmsd"],
                        "radius_of_gyration": apoint["radius_of_gyration"],
                        "helix": apoint["helix"],
                        "sheet": apoint["sheet"],
                        "coil": apoint["coil"],
                        "potential_energy": apoint.get("potential_energy", 0.0),
                        "kinetic_energy": apoint.get("kinetic_energy", 0.0),
                        "total_energy": apoint.get("total_energy", 0.0),
                    },
                )
                with open(packet_file, "wb") as _packet_f:
                    _packet_f.write(packet)
                return {
                    "slot_index": slot_index,
                    "source_frame": source_frame,
                    "time_ns": round(time_ns_done, 4),
                    "packet_file": packet_file,
                    "analysis": apoint,
                    "display_positions_nm": display_positions_nm,
                }
            except Exception as _e:
                logger.warning(f"[LIVE] Worker failed at frame {source_frame}: {_e}")
                return None

        for phase_name, time_ns in phases:
            if time_ns <= 0: continue
            check_job_status()
            update_status(phase_name, 30, f"Starting {phase_name} ({time_ns} ns)")
            logger.info(f"Entering phase: {phase_name}")

            if phase_name == "nvt_equil":
                barostat.setFrequency(0)
                simulation.context.reinitialize(preserveState=True)
                simulation.context.setVelocitiesToTemperature(temp)
            elif phase_name == "npt_equil":
                barostat.setFrequency(config.get("barostat_frequency", 25))
                simulation.context.reinitialize(preserveState=True)
            elif phase_name == "production":
                if equil_reporter is not None and equil_reporter in simulation.reporters:
                    simulation.reporters.remove(equil_reporter)
                ref_state = simulation.context.getState(getPositions=True)
                ref_pos_nm = np.asarray(ref_state.getPositions(asNumpy=True).value_in_unit(omm_unit.nanometer), dtype=np.float32)
                with open("reference.pdb", "w") as f:
                    PDBFile.writeFile(mod.topology, ref_state.getPositions(), f)
                reference_traj = md.load("reference.pdb")
                backbone_indices = reference_traj.topology.select('backbone')
                ref_xyz_bb = ref_pos_nm[backbone_indices]  # pre-slice for fast RMSD
                ca_indices = reference_traj.topology.select('protein and name CA')
                ref_xyz_ca = ref_pos_nm[ca_indices]
                ref_xyz_ligand = ref_pos_nm[ligand_indices] if len(ligand_indices) else None
                with open("live_topology.pdb", "w") as f:
                    PDBFile.writeFile(mod.topology, ref_state.getPositions(), f)
                logger.info(f"Saved reference structure, {len(backbone_indices)} backbone atoms, {len(ca_indices)} CA atoms for live RMSF")
            elif equil_reporter is None:
                equil_reporter = XTCReporter("equil.xtc", snapshot_interval_steps)
                simulation.reporters.append(equil_reporter)

            steps = int(time_ns * 1e6 / dt.value_in_unit(omm_unit.femtoseconds))
            if phase_name == "production":
                simulation.reporters.append(XTCReporter("prod.xtc", snapshot_interval_steps))

            done = 0
            chunk = snapshot_interval_steps
            update_interval = 5
            chunk_count = 0
            phase_start = time.time()
            while done < steps:
                curr = min(chunk, steps - done)
                simulation.step(curr)  # GPU runs; do NOT block here with analysis
                done += curr
                chunk_count += 1

                if chunk_count % update_interval == 0:
                    check_job_status()
                    elapsed = time.time() - phase_start
                    speed = (done * dt.value_in_unit(omm_unit.femtoseconds) / 1e6) / elapsed * 86400 if elapsed > 0 else 0
                    progress = 30 + (60 * (done / steps)) if phase_name == "production" else 30
                    update_status(phase_name, progress, details=f"Completed {done}/{steps} steps", speed=speed)

                if phase_name == "production" and reference_traj is not None:
                    # Grab positions NOW (fast GPU→CPU copy) then immediately let GPU continue
                    source_frame = chunk_count - 1
                    if _pending_live_future is not None:
                        result = _pending_live_future.result()
                        if result is not None:
                            _frame_packets.append(result)
                            _live_analysis_buf.append(result["analysis"])
                            prev_display_positions_nm = result["display_positions_nm"]
                            jc[f"{job_id}_stream_frames"] = _frame_packets
                            jc[f"{job_id}_analysis"] = _live_analysis_buf
                            vl.commit()
                    if source_frame % live_stream_slots == 0:
                        state = simulation.context.getState(getPositions=True)
                        pos_nm = np.asarray(state.getPositions(asNumpy=True).value_in_unit(omm_unit.nanometer), dtype=np.float32)
                        box_vectors_nm = np.asarray(
                            state.getPeriodicBoxVectors(asNumpy=True).value_in_unit(omm_unit.nanometer),
                            dtype=np.float32,
                        )
                        ca_disp = pos_nm[ca_indices] - ref_xyz_ca
                        rmsf_vals = np.sqrt(np.sum(ca_disp ** 2, axis=1)) * 10.0
                        snap_file = f"frame_{source_frame:04d}.pdb"
                        packet_file = f"stream_slot_{frame_count:03d}.bin"
                        time_ns_done = done * dt.value_in_unit(omm_unit.femtoseconds) / 1e6
                        progress = 30 + (60 * (done / steps))
                        read_energy = (chunk_count % update_interval == 0)
                        _pending_live_future = _live_executor.submit(
                            _live_worker,
                            pos_nm,
                            None if prev_display_positions_nm is None else prev_display_positions_nm.copy(),
                            box_vectors_nm,
                            mod.topology,
                            reference_traj.topology,
                            ref_xyz_bb,
                            backbone_indices,
                            ligand_indices,
                            ref_xyz_ligand,
                            rmsf_vals,
                            snap_file,
                            packet_file,
                            frame_count,
                            source_frame,
                            time_ns_done,
                            progress,
                            read_energy,
                        )
                        frame_count += 1

        # Drain any remaining live future
        if _pending_live_future is not None:
            try:
                result = _pending_live_future.result(timeout=30)
                if result:
                    _frame_packets.append(result)
                    _live_analysis_buf.append(result["analysis"])
                    prev_display_positions_nm = result["display_positions_nm"]
                    jc[f"{job_id}_stream_frames"] = _frame_packets
                    jc[f"{job_id}_analysis"] = _live_analysis_buf
                    vl.commit()
            except Exception as _drain_e:
                logger.warning(f"[LIVE] Final drain failed: {_drain_e}")
        _live_executor.shutdown(wait=False)

        update_status("Finalizing", 90, "Saving final structure")
        with open("complex.pdb", "w") as f:
            PDBFile.writeFile(mod.topology, simulation.context.getState(getPositions=True).getPositions(), f)

        update_status("Analysis", 92, "Loading trajectory for post-production analysis")
        logger.info("Starting trajectory analysis")

        from MDAnalysis import transformations
        from MDAnalysis.analysis import align

        logger.info("Loading MDAnalysis universe")
        u_mda = mda.Universe("complex.pdb", "prod.xtc")
        try:
            protein = u_mda.select_atoms("protein")
            u_mda.trajectory.add_transformations(
                transformations.unwrap(u_mda.atoms),
                transformations.center_in_box(protein, center='geometry'),
            )
            logger.info("Applied PBC unwrapping and centering transformations")
        except Exception as e:
            logger.warning(f"Could not apply trajectory transformations: {e}")
        logger.info(f"Loaded MDA trajectory with {len(u_mda.trajectory)} frames")

        logger.info("Loading MDTraj trajectory")
        u_mdtraj = md.load("prod.xtc", top="complex.pdb")
        try:
            u_mdtraj.image_molecules(inplace=True)
            logger.info("Applied MDTraj image_molecules for PBC")
        except Exception as e:
            logger.warning(f"MDTraj imaging failed: {e}")
        logger.info(f"Loaded MDTraj trajectory with {u_mdtraj.n_frames} frames")

        prod_time = config.get("production_time_ns", 10.0)
        ts = lambda vals: [{"time": float(i * prod_time / len(vals)), "value": float(v)} for i, v in enumerate(vals)]
        
        def save_plot(df, x, y, title, filename, label=None):
            plt.figure(figsize=(8, 6))
            if label:
                for col in label:
                    plt.plot(df[x], df[col], label=col, linewidth=2)
                plt.legend(frameon=False)
            else:
                sns.lineplot(data=df, x=x, y=y, linewidth=2)
            plt.xlabel(x, fontsize=14, fontweight='bold')
            plt.ylabel(y, fontsize=14, fontweight='bold')
            plt.title(title, fontsize=16, fontweight='bold')
            plt.xticks(fontsize=12)
            plt.yticks(fontsize=12)
            sns.despine()
            plt.tight_layout()
            plt.savefig(filename, dpi=200)
            plt.savefig(filename.replace('.png', '_hq.png'), dpi=600, bbox_inches='tight')
            plt.close()


        # Save a viewer-optimized unwrapped trajectory before running parallel analysis
        logger.info("Generating viewer.xtc with unwrapped coordinates for fast playback")
        viewer_xtc = "viewer.xtc"
        try:
            with mda.Writer(viewer_xtc, u_mda.trajectory.n_atoms) as W:
                for _ in u_mda.trajectory:
                    W.write(u_mda)
            logger.info("Saved unwrapped viewer.xtc")
        except Exception as e:
            logger.warning(f"Failed to write viewer.xtc, falling back to prod.xtc: {e}")
            viewer_xtc = "prod.xtc"

        # Free MDA memory map, we will use iterload for chunks now
        del u_mda
        
        analysis_results = {}
        logger.info("Starting true parallel analysis with ProcessPoolExecutor (4 workers)")
        
        # We pass filenames instead of objects to ProcessPool worker so they can stream from disk independently
        import multiprocessing
        
        with multiprocessing.Pool(processes=4) as pool:
            futures = [
                pool.apply_async(run_rmsd, ("complex.pdb", viewer_xtc, prod_time)),
                pool.apply_async(run_ligand_rmsd, ("complex.pdb", viewer_xtc, prod_time)),
                pool.apply_async(run_rmsf, ("complex.pdb", viewer_xtc, prod_time)),
                pool.apply_async(run_rg, ("complex.pdb", viewer_xtc, prod_time)),
                pool.apply_async(run_dssp, ("complex.pdb", viewer_xtc, prod_time))
            ]
            
            PLOT_CFG = {
                "rmsd":             ("Time", "RMSD (Å)",                "RMSD",                "rmsd.png",  "rmsd.csv",  None),
                "ligandRmsd":      ("Time", "Ligand RMSD (Å)",         "Ligand RMSD",         "ligand_rmsd.png", "ligand_rmsd.csv", None),
                "rmsf":             ("Residue", "RMSF (Å)",            "RMSF",                "rmsf.png",  "rmsf.csv",  None),
                "radiusOfGyration": ("Time", "Radius of gyration (Å)", "Radius of gyration",  "rg.png",    "rg.csv",         None),
                "dssp":             ("Time", "Secondary Structure Count", "Secondary Structure", "ss.png", "ss.csv", ['Helix','Sheet','Coil']),
            }

            for future in futures:
                key, data, df = future.get()
                if key and df is not None:
                    if data: analysis_results[key] = data
                    try:
                        logger.info(f"[{key}] Generating plots")
                        x_col, y_label, title, png, csv, multi = PLOT_CFG[key]
                        y_col = y_label.split(" (")[0] if not multi else y_label
                        if csv: df.write_csv(csv)
                        save_plot(df, x_col, list(df.columns)[1] if not multi else y_col, title, png, label=multi)
                        logger.info(f"[{key}] Plot saved")
                    except Exception as e:
                        logger.error(f"[{key}] Plotting failed: {e}", exc_info=True)
                else:
                    logger.warning(f"[{key}] Analysis returned no data")

        
        # Load energy data
        try:
            if os.path.exists("energy.csv"):
                logger.info("Parsing energy.csv into analysis_results and generating plot")
                import polars as pl
                try:
                    df_e = pl.read_csv("energy.csv")
                    # Clean up column names by removing whitespace and quotes
                    new_cols = [c.strip().strip('"') for c in df_e.columns]
                    df_e.columns = new_cols
                    plt.figure(figsize=(8, 6))
                    for col in ["Potential Energy (kJ/mole)", "Kinetic Energy (kJ/mole)", "Total Energy (kJ/mole)"]:
                        if col in df_e.columns:
                            plt.plot(df_e["Time (ps)"].to_numpy(), df_e[col].to_numpy(), label=col.split(" (")[0], linewidth=2)
                    plt.xlabel("Time (ps)", fontsize=14, fontweight='bold')
                    plt.ylabel("Energy (kJ/mole)", fontsize=14, fontweight='bold')
                    plt.legend(frameon=False)
                    plt.title("System Energy", fontsize=16, fontweight='bold')
                    plt.xticks(fontsize=12)
                    plt.yticks(fontsize=12)
                    sns.despine()
                    plt.tight_layout()
                    plt.savefig("energy.png", dpi=200)
                    plt.savefig("energy_hq.png", dpi=600, bbox_inches='tight')
                    plt.close()
                except Exception as p_e:
                    logger.warning(f"Failed to generate energy.png: {p_e}")

                ene_data = []
                with open("energy.csv", "r") as f:
                    lines = f.readlines()
                for i, line in enumerate(lines[1:]):
                    parts = line.strip().split(',')
                    if len(parts) >= 5:
                        ene_data.append({
                            "frame": i,
                            "time": round(float(parts[1]) / 1000.0, 4), # ps to ns
                            "potential": round(float(parts[2]), 2),
                            "kinetic": round(float(parts[3]), 2),
                            "total": round(float(parts[4]), 2),
                        })
                if ene_data:
                    analysis_results["energy"] = ene_data
        except Exception as e:
            logger.warning(f"Failed to parse energy data: {e}")

        logger.info("Saving frame count to job control")
        try:
            jc[f"{job_id}_frame_count"] = u_mdtraj.n_frames
        except Exception:
            pass

        logger.info("Freeing trajectory memory")
        del u_mdtraj
        
        logger.info("All analysis tasks completed")
        update_status("Analysis", 95, "Analysis tasks completed", analysis_data=analysis_results)
        
        # Ensure all files are committed to volume before webhook
        logger.info("Committing all files to volume...")
        vl.commit()
        
        update_status("Finalizing", 98, "Creating output tarball")
        logger.info("Creating output tarball")
        with tarfile.open("md.tar.gz","w:gz") as tar:
            for file in os.listdir("."):
                if file != "md.tar.gz":
                    tar.add(file, arcname=file)
        logger.info(f"Job {job_id} completed successfully. Output saved to md.tar.gz")
        vl.commit()
        
        elapsed = time.time() - start_time
        final_state = {
            "status": "completed",
            "current_step": "Completed",
            "progress_percent": 100,
            "time_elapsed_seconds": round(elapsed, 2),
            "details": "MD simulation completed successfully"
        }
        if analysis_results:
            final_state["analysis_data"] = analysis_results
        jc[job_id] = final_state
        notify_webhook({
            "job_id": job_id,
            "status": "completed",
            "current_step": "Completed",
            "progress_percent": 100,
            "time_elapsed_seconds": round(elapsed, 2),
            "details": "MD simulation completed successfully",
        })

    except Exception as e:
        elapsed = time.time() - start_time
        jc[job_id] = {
            "status": "failed",
            "current_step": "Error",
            "progress_percent": 0,
            "time_elapsed_seconds": round(elapsed, 2),
            "details": f"Error: {str(e)}",
            "error": str(e)
        }
        notify_webhook({
            "job_id": job_id,
            "status": "failed",
            "current_step": "Error",
            "progress_percent": 0,
            "time_elapsed_seconds": round(elapsed, 2),
            "details": f"Error: {str(e)}",
            "error": str(e),
        })
        raise

@app.function(image=image,volumes={"/data":vl},scaledown_window=300)
@modal.concurrent(max_inputs=100)
@modal.asgi_app()
def fapi():
    import os, uuid, base64
    from fastapi import FastAPI,File,UploadFile,WebSocket,WebSocketDisconnect
    from fastapi.responses import FileResponse,JSONResponse
    from fastapi.middleware.cors import CORSMiddleware
    from typing import Optional
    import asyncio
    api=FastAPI()
    api.add_middleware(CORSMiddleware,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])
    @api.post("/jobs",
              summary="Create a new MD simulation job",
              description="""Create a new molecular dynamics simulation job by uploading files.

**Required Files:**
- `protein`: PDB file containing the protein structure
- `config`: JSON file with simulation configuration (see format below)

**Optional Files:**
- `ligand`: SDF file containing the ligand structure

---


Upload a JSON file with the following structure:

```json
{
    "forcefield": "amber19-default",
    "solvation_model": "opc-default",
    "ph": 7.4,
    "hmr": true,
    "temperature_K": 300.0,
    "pressure_bar": 1.0,
    "timestep_fs": 2.0,
    "equilibration_time_ns": 1.0,
    "production_time_ns": 10.0,
    "padding_nm": 1.0,
    "ionic_strength_mol": 0.15,
    "minimization_max_steps": 10
}
```
""")
    async def create_job(
        protein: UploadFile = File(..., description="Protein structure in PDB format"),
        ligand: Optional[UploadFile] = File(None, description="Ligand structure in SDF format (optional)"),
        config: UploadFile = File(..., description="Simulation configuration in JSON format")
    ):
        job_id=str(uuid.uuid4())
        protein_bytes=await protein.read()
        ligand_bytes=await ligand.read() if ligand else None
        config_bytes=await config.read()
        await jc.put.aio(job_id, {
            "status": "queued",
            "current_step": "Queued",
            "progress_percent": 0,
            "time_elapsed_seconds": 0,
            "details": "Job queued for execution"
        })
        await md.spawn.aio(job_id,protein_bytes,ligand_bytes,config_bytes.decode())
        return {"job_id":job_id, "message": "Job submitted successfully"}
    
    @api.get("/jobs/{job_id}/status",
             summary="Get job status",
             description="Get detailed status of a running or completed MD simulation job")
    async def get_status(job_id:str):
        if await jc.contains.aio(job_id):
            status_data = await jc.get.aio(job_id)
            return JSONResponse(content=status_data)
        else:
            return JSONResponse(
                status_code=404,
                content={"error": "Job not found", "job_id": job_id}
            )

    @api.websocket("/ws/jobs/{job_id}/stream")
    async def ws_job_stream(websocket: WebSocket, job_id: str):
        await websocket.accept()
        import mdtraj as md
        import numpy as np
        log_path = f"/data/{job_id}/simulation.log"

        async def send_init(slot_count_hint):
            topology_path = f"/data/{job_id}/live_topology.pdb"
            if not os.path.exists(topology_path):
                topology_path = f"/data/{job_id}/complex.pdb"
            if not os.path.exists(topology_path):
                return
            with open(topology_path, "rb") as fh:
                pdb_bytes = fh.read()
            atom_count = len(coords_from_pdb_bytes(pdb_bytes)) // 3
            residue_count = 0
            try:
                residue_count = len(md.load(topology_path).topology.select("protein and name CA"))
            except Exception:
                residue_count = 0
            await websocket.send_bytes(init_packet(pdb_bytes, atom_count, slot_count_hint, residue_count))

        def parse_csv(filename):
            path = f"/data/{job_id}/{filename}"
            if not os.path.exists(path):
                return []
            with open(path, "r", errors="replace") as fh:
                lines = [line.strip() for line in fh.readlines() if line.strip()]
            if len(lines) < 2:
                return []
            header = [h.strip().strip('"').lstrip("#") for h in lines[0].split(",")]
            rows = []
            for line in lines[1:]:
                if line.startswith("#"):
                    continue
                values = [value.strip().strip('"') for value in line.split(",")]
                rows.append({header[idx]: values[idx] if idx < len(values) else "" for idx in range(len(header))})
            return rows

        async def stream_replay():
            await vl.reload.aio()
            viewer_xtc_path = f"/data/{job_id}/viewer.xtc"
            base_xtc_path = f"/data/{job_id}/prod.xtc"
            xtc_path = viewer_xtc_path if os.path.exists(viewer_xtc_path) else base_xtc_path
            pdb_path = f"/data/{job_id}/complex.pdb"
            if not os.path.exists(xtc_path) or not os.path.exists(pdb_path):
                return
            total_frames = 0
            key = f"{job_id}_frame_count"
            if await jc.contains.aio(key):
                total_frames = await jc.get.aio(key)
            else:
                with md.formats.XTCTrajectoryFile(xtc_path) as xtc_file:
                    total_frames = len(xtc_file)
            sample_indices = sample_frame_indices(total_frames)
            await send_init(len(sample_indices))
            rmsd_rows = parse_csv("rmsd.csv")
            ligand_rows = parse_csv("ligand_rmsd.csv")
            rg_rows = parse_csv("rg.csv")
            energy_rows = parse_csv("energy.csv")
            rmsf_rows = parse_csv("rmsf.csv")
            rmsf_vals = [float(row.get("RMSF", row.get("value", "0")) or 0) for row in rmsf_rows]
            for slot_index, source_frame in enumerate(sample_indices):
                frame = md.load_frame(xtc_path, top=pdb_path, index=source_frame)
                coords = (frame.xyz[0] * 10.0).astype(np.float32)
                dssp_frame = md.compute_dssp(frame)[0]
                scalars = {
                    "frame": float(slot_index),
                    "backbone_rmsd": float(rmsd_rows[source_frame].get("RMSD", rmsd_rows[source_frame].get("value", 0)) if source_frame < len(rmsd_rows) else 0),
                    "ligand_rmsd": float(ligand_rows[source_frame].get("Ligand RMSD", ligand_rows[source_frame].get("value", 0)) if source_frame < len(ligand_rows) else 0),
                    "radius_of_gyration": float(rg_rows[source_frame].get("Radius of gyration", rg_rows[source_frame].get("value", 0)) if source_frame < len(rg_rows) else 0),
                    "helix": float((dssp_frame == "H").sum()),
                    "sheet": float((dssp_frame == "E").sum()),
                    "coil": float((dssp_frame == "C").sum()),
                }
                if source_frame < len(energy_rows):
                    energy_row = energy_rows[source_frame]
                    scalars["potential_energy"] = float(energy_row.get("Potential Energy (kJ/mole)", energy_row.get("potential", 0)) or 0)
                    scalars["kinetic_energy"] = float(energy_row.get("Kinetic Energy (kJ/mole)", energy_row.get("kinetic", 0)) or 0)
                    scalars["total_energy"] = float(energy_row.get("Total Energy (kJ/mole)", energy_row.get("total", 0)) or 0)
                time_ns = float(source_frame * 0.01)
                await websocket.send_bytes(frame_packet(
                    slot_index=slot_index,
                    source_frame=source_frame,
                    time_ns=time_ns,
                    progress=100.0,
                    coords_angstrom=coords,
                    rmsf_vals=rmsf_vals,
                    dssp_vals=dssp_codes(dssp_frame),
                    scalars=scalars,
                ))
            await websocket.send_bytes(build_packet(PACKET_END, {"status": "completed"}))

        try:
            sent_log_lines = 0
            sent_stream_idx = 0
            sent_init = False

            while True:
                try:
                    await vl.reload.aio()

                    if await jc.contains.aio(job_id):
                        state = await jc.get.aio(job_id)
                        await websocket.send_bytes(status_packet(state))
                        slot_count_hint = state.get("stream_slot_count", 0)
                        if not slot_count_hint and await jc.contains.aio(f"{job_id}_stream_slot_count"):
                            slot_count_hint = await jc.get.aio(f"{job_id}_stream_slot_count")
                        if not sent_init and slot_count_hint:
                            await send_init(slot_count_hint)
                            sent_init = True
                        if state.get("status") in ("completed", "failed", "canceled", "cancelled"):
                            if os.path.exists(log_path):
                                with open(log_path, "r", errors="replace") as f:
                                    lines = f.readlines()
                                if len(lines) > sent_log_lines:
                                    await websocket.send_bytes(logs_packet("".join(lines[sent_log_lines:]), sent_log_lines))
                            if state.get("status") == "completed":
                                await stream_replay()
                            else:
                                await websocket.send_bytes(build_packet(PACKET_END, {"status": state.get("status")}))
                            break
                    else:
                        await websocket.send_bytes(status_packet({"status": "not_found"}))
                        break

                    if os.path.exists(log_path):
                        with open(log_path, "r", errors="replace") as f:
                            lines = f.readlines()
                        if len(lines) > sent_log_lines:
                            await websocket.send_bytes(logs_packet("".join(lines[sent_log_lines:]), sent_log_lines))
                            sent_log_lines = len(lines)

                    frame_key = f"{job_id}_stream_frames"
                    if await jc.contains.aio(frame_key):
                        frame_packets = await jc.get.aio(frame_key)
                        if frame_packets and len(frame_packets) > sent_stream_idx:
                            for packet_info in frame_packets[sent_stream_idx:]:
                                packet_path = f"/data/{job_id}/{packet_info['packet_file']}"
                                if os.path.exists(packet_path):
                                    with open(packet_path, "rb") as packet_fh:
                                        await websocket.send_bytes(packet_fh.read())
                            sent_stream_idx = len(frame_packets)

                except WebSocketDisconnect:
                    return
                except Exception as e:
                    try:
                        await websocket.send_bytes(error_packet(str(e)))
                    except Exception:
                        return

                await asyncio.sleep(1.5)
        except WebSocketDisconnect:
            pass
        finally:
            try:
                await websocket.close()
            except Exception:
                pass


    @api.get("/jobs/{job_id}/files/{filename:path}", summary="Get specific job file")
    async def get_job_file(job_id: str, filename: str):
        await vl.reload.aio()
        file_path = f"/data/{job_id}/{filename}"
        if os.path.exists(file_path):
            return FileResponse(file_path)
        return JSONResponse(status_code=404, content={"error": "File not found"})

    @api.get("/jobs/{job_id}/frame-count", summary="Get total extracted frame count")
    async def get_frame_count(job_id: str):
        """Returns the total number of frames in the production XTC trajectory."""
        key = f"{job_id}_frame_count"
        if await jc.contains.aio(key):
            count = await jc.get.aio(key)
            return {"job_id": job_id, "total_frames": count}
        return JSONResponse(status_code=404, content={"error": "Trajectory stats not ready"})

    @api.get("/jobs/{job_id}/frame/{frame_index}", summary="Get a specific trajectory frame as PDB")
    async def get_frame(job_id: str, frame_index: int):
        """Returns a single trajectory frame extracted on-the-fly from the XTC file using MDTraj."""
        import mdtraj as md
        import tempfile
        import os
        from fastapi import Response
        
        await vl.reload.aio()
        xtc_path = f"/data/{job_id}/prod.xtc"
        pdb_path = f"/data/{job_id}/complex.pdb"
        
        if not os.path.exists(xtc_path) or not os.path.exists(pdb_path):
            return JSONResponse(status_code=404, content={"error": "Trajectory files not found"})
            
        try:
            t = md.load_frame(xtc_path, top=pdb_path, index=frame_index)
            try:
                t.image_molecules(inplace=True)
            except Exception:
                pass
            fd, fpath = tempfile.mkstemp(suffix=".pdb")
            os.close(fd)
            t.save_pdb(fpath)
            with open(fpath, "r") as f:
                pdb_str = f.read()
            os.remove(fpath)
            return Response(content=pdb_str, media_type="chemical/x-pdb")
        except IndexError:
            return JSONResponse(status_code=404, content={"error": f"Frame {frame_index} out of bounds"})
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @api.websocket("/ws/jobs/{job_id}/playback")
    async def ws_playback(websocket: WebSocket, job_id: str):
        """
        High-performance WebSocket for streaming trajectory frames. 
        Loads the trajectory ONCE into memory, then rapidly serves requested frames.
        """
        import mdtraj as md
        import tempfile
        import os
        import json

        await websocket.accept()
        await vl.reload.aio()
        
        # Check for our pre-processed unwrapped viewer.xtc first, fallback to prod.xtc
        viewer_xtc_path = f"/data/{job_id}/viewer.xtc"
        base_xtc_path = f"/data/{job_id}/prod.xtc"
        xtc_path = viewer_xtc_path if os.path.exists(viewer_xtc_path) else base_xtc_path
        
        pdb_path = f"/data/{job_id}/complex.pdb"

        if not os.path.exists(xtc_path) or not os.path.exists(pdb_path):
            await websocket.send_json({"error": "Trajectory files not found"})
            await websocket.close()
            return
            
        # 1. Load ONLY the topology into RAM memory ONCE to avoid huge memory spikes
        try:
            # Parse the topology
            base_pdb = md.load(pdb_path)
            cached_topology = base_pdb.topology
            
            # Fast get total frames
            total_frames = 0
            key = f"{job_id}_frame_count"
            if await jc.contains.aio(key):
                total_frames = await jc.get.aio(key)
            else:
                with md.formats.XTCTrajectoryFile(xtc_path) as f:
                    total_frames = len(f)
                    
            await websocket.send_json({"type": "ready", "total_frames": total_frames})
        except Exception as e:
            await websocket.send_json({"error": f"Failed to initialize trajectory: {str(e)}"})
            await websocket.close()
            return

        # 2. Listen for frame requests
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    msg = json.loads(data)
                except:
                    continue
                    
                action = msg.get("action")
                if action == "get_frame":
                    frame_idx = msg.get("frame_index")
                    if frame_idx is None or frame_idx < 0 or frame_idx >= total_frames:
                        await websocket.send_json({"error": "Invalid frame index", "frame_index": frame_idx})
                        continue
                        
                    # Extract the single frame from XTC using the cached topology (Very fast, ~5MB RAM usage)
                    t_frame = md.load_frame(xtc_path, top=cached_topology, index=frame_idx)
                    # We NO LONGER need image_molecules here because viewer.xtc is PRE-UNWRAPPED!
                    
                    # Convert to PDB string
                    fd, fpath = tempfile.mkstemp(suffix=".pdb")
                    os.close(fd)
                    t_frame.save_pdb(fpath)
                    with open(fpath, "r") as f:
                        pdb_str = f.read()
                    os.remove(fpath)
                    del t_frame
                    
                    # Send instantly over socket
                    await websocket.send_json({
                        "type": "frame_data",
                        "frame_index": frame_idx,
                        "pdb": pdb_str
                    })
        except WebSocketDisconnect:
            pass
        finally:
            del cached_topology
            del base_pdb
            try:
                await websocket.close()
            except:
                pass

    @api.get("/jobs/{job_id}/tar",
             summary="Get job results",
             description="Download job results as a tar.gz file")
    async def get_job(job_id:str):
        await vl.reload.aio()
        tar_path=f"/data/{job_id}/md.tar.gz"
        if os.path.exists(tar_path):
            return FileResponse(tar_path,media_type="application/gzip",filename=f"md_{job_id}.tar.gz")

    @api.post("/jobs/{job_id}/mirror-complete",
              summary="Callback when Convex finishes mirroring")
    async def mirror_complete_callback(job_id: str):
        """Called by Convex when it finishes mirroring files to storage."""
        logger.info(f"Received mirror-complete callback for job {job_id}")
        jc[f"{job_id}_mirror_complete"] = True
        return {"status": "ok", "job_id": job_id}
    
    return api
