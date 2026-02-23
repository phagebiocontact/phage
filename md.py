import modal
from modal import Volume as vol,Dict,Image as img,App
import time
vl=vol.from_name("md-storage",create_if_missing=True)
jc=Dict.from_name("md-job-control",create_if_missing=True)
image = img.debian_slim(python_version="3.12").micromamba().micromamba_install("openmm","cuda-version=12.8", "openmmforcefields", "openff-toolkit", "openff-forcefields", "mdtraj", "mdanalysis", "ambertools", "rdkit", "pdbfixer", "matplotlib", "seaborn", "numpy", "scipy", "polars", "fastapi", "parmed", "loguru", channels=["conda-forge"])
app=modal.App(name="md")
@app.function(image=image,gpu="T4",volumes={"/data":vl},scaledown_window=300,timeout=86400,retries=10,enable_memory_snapshot=True,experimental_options={"enable_gpu_snapshot":True})
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
        
        if ligand_mol:
            update_status("Preparing System", 15, "Adding ligand to system")
            lig_off_top = ligand_mol.to_topology().to_openmm()
            mod.add(lig_off_top, ligand_mol.conformers[0].to_openmm())
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
            
            steps = int(time_ns * 1e6 / dt.value_in_unit(omm_unit.femtoseconds))
            if phase_name == "production":
                simulation.reporters.append(XTCReporter("prod.xtc", max(1, steps // 100)))
            
            done = 0
            chunk = 10000
            update_interval = 10
            chunk_count = 0
            phase_start = time.time()
            while done < steps:
                curr = min(chunk, steps - done)
                simulation.step(curr)
                done += curr
                chunk_count += 1
                if chunk_count % update_interval == 0:
                    check_job_status()
                    elapsed = time.time() - phase_start
                    speed = (done * dt.value_in_unit(omm_unit.femtoseconds) / 1e6) / elapsed * 86400 if elapsed > 0 else 0
                    progress = 30 + (70 * (done / steps)) if phase_name == "production" else 30
                    update_status(phase_name, progress, details=f"Completed {done}/{steps} steps", speed=speed)

        update_status("Finalizing", 90, "Saving final structure")
        with open("complex.pdb", "w") as f:
            PDBFile.writeFile(mod.topology, simulation.context.getState(getPositions=True).getPositions(), f)

        update_status("Analysis", 75, "Loading trajectory for analysis")
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
            plt.figure()
            if label:  # multi-line (dssp)
                for col in label:
                    plt.plot(df[x], df[col], label=col)
                plt.legend()
            else:
                sns.lineplot(data=df, x=x, y=y)
            plt.xlabel(x); plt.ylabel(y); plt.title(title)
            plt.savefig(filename, dpi=200); plt.close()

        def run_rmsd(universe):
            try:
                logger.info("[RMSD] Starting calculation")
                r = rms.RMSD(universe, select='backbone', groupselections=['backbone'], ref_frame=0)
                r.run()
                vals = r.results.rmsd[:, 2]
                df = pl.DataFrame({'Time': np.arange(len(vals)) * (prod_time / len(vals)), 'RMSD': vals})
                logger.info(f"[RMSD] Completed successfully, {len(vals)} data points, max={vals.max():.2f} Å")
                return ("rmsd", ts(vals), df)
            except Exception as e:
                logger.error(f"[RMSD] Analysis failed: {e}", exc_info=True)
                return ("rmsd", None, None)

        def run_rmsf(universe):
            try:
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
                logger.error(f"[RMSF] Analysis failed: {e}", exc_info=True)
                return ("rmsf", None, None)

        def run_rg(traj):
            try:
                logger.info("[Rg] Starting calculation")
                rg = md.compute_rg(traj)
                df = pl.DataFrame({"Time": np.arange(len(rg)) * (prod_time / len(rg)), "Radius of gyration": rg})
                logger.info(f"[Rg] Completed successfully, {len(rg)} data points")
                return ("radiusOfGyration", ts(rg), df)
            except Exception as e:
                logger.error(f"[Rg] Analysis failed: {e}", exc_info=True)
                return ("radiusOfGyration", None, None)

        def run_sasa(traj):
            try:
                logger.info("[SASA] Starting calculation")
                totalsasa = md.shrake_rupley(traj).sum(axis=1)
                df = pl.DataFrame({"Time": np.arange(len(totalsasa)) * (prod_time / len(totalsasa)), "Total SASA": totalsasa})
                logger.info(f"[SASA] Completed successfully, {len(totalsasa)} data points")
                return ("sasa", ts(totalsasa), df)
            except Exception as e:
                logger.error(f"[SASA] Analysis failed: {e}", exc_info=True)
                return ("sasa", None, None)

        def run_dssp(traj):
            try:
                logger.info("[DSSP] Starting calculation")
                dssp = md.compute_dssp(traj)
                ss_df = pl.DataFrame({
                    'Time': np.arange(len(dssp)) * (prod_time / len(dssp)),
                    'Helix': (dssp == 'H').sum(axis=1),
                    'Sheet': (dssp == 'E').sum(axis=1),
                    'Coil': (dssp == 'C').sum(axis=1)
                })
                logger.info(f"[DSSP] Completed successfully, {len(dssp)} frames")
                return ("dssp", None, ss_df)
            except Exception as e:
                logger.error(f"[DSSP] Analysis failed: {e}", exc_info=True)
                return ("dssp", None, None)

        analysis_results = {}
        logger.info("Starting parallel analysis with 5 workers (shared trajectory)")
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(run_rmsd, u_mda),
                executor.submit(run_rmsf, u_mda),
                executor.submit(run_rg, u_mdtraj),
                executor.submit(run_sasa, u_mdtraj),
                executor.submit(run_dssp, u_mdtraj)
            ]

            PLOT_CFG = {
                "rmsd":             ("Time", "RMSD (Å)",                "RMSD",                "rmsd.png",  "rmsd.csv",  None),
                "rmsf":             ("Residue", "RMSF (Å)",            "RMSF",                "rmsf.png",  "rmsf.csv",  None),
                "radiusOfGyration": ("Time", "Radius of gyration (Å)", "Radius of gyration",  "rg.png",    "rg.csv",         None),
                "sasa":             ("Time", "Total SASA (Å^2)",      "Total SASA",          "sasa.png",  "sasa.csv",  None),
                "dssp":             ("Time", "Secondary Structure Count", "Secondary Structure", "ss.png", "ss.csv", ['Helix','Sheet','Coil']),
            }

            for future in futures:
                key, data, df = future.result()
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

        logger.info("Freeing trajectory memory")
        del u_mda, u_mdtraj
        
        logger.info("All analysis tasks completed")
        update_status("Analysis", 95, "Analysis tasks completed", analysis_data=analysis_results)
        
        update_status("Finalizing", 98, "Creating output tarball")
        logger.info("Creating output tarball")
        with tarfile.open("md.tar.gz","w:gz") as tar:
            for file in os.listdir("."):
                if file != "md.tar.gz":
                    tar.add(file, arcname=file)
        logger.info(f"Job {job_id} completed successfully. Output saved to md.tar.gz")
        vl.commit()
        
        elapsed = time.time() - start_time
        jc[job_id] = {
            "status": "completed",
            "current_step": "Completed",
            "progress_percent": 100,
            "time_elapsed_seconds": round(elapsed, 2),
            "details": "MD simulation completed successfully"
        }
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
        raise

@app.function(image=image,volumes={"/data":vl},scaledown_window=300)
@modal.concurrent(max_inputs=100)
@modal.asgi_app()
def fapi():
    import os, uuid
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

    @api.post("/jobs/{job_id}/pause", summary="Pause a job")
    async def pause_job(job_id: str):
        if not await jc.contains.aio(job_id): 
            return JSONResponse(status_code=404, content={"error": "Job not found"})
        state = await jc.get.aio(job_id)
        state["paused"] = True
        await jc.put.aio(job_id, state)
        return {"status": "paused"}

    @api.post("/jobs/{job_id}/resume", summary="Resume a job")
    async def resume_job(job_id: str):
        if not await jc.contains.aio(job_id): 
            return JSONResponse(status_code=404, content={"error": "Job not found"})
        state = await jc.get.aio(job_id)
        state["paused"] = False
        await jc.put.aio(job_id, state)
        return {"status": "resumed"}

    @api.post("/jobs/{job_id}/cancel", summary="Cancel a job")
    async def cancel_job(job_id: str):
        if not await jc.contains.aio(job_id): 
            return JSONResponse(status_code=404, content={"error": "Job not found"})
        state = await jc.get.aio(job_id)
        state["cancelled"] = True
        await jc.put.aio(job_id, state)
        return {"status": "cancelled"}


    @api.websocket("/ws/jobs/{job_id}")
    async def ws_job_status(websocket: WebSocket, job_id: str):
        await websocket.accept()
        try:
            last_state = None
            while True:
                try:
                    if await jc.contains.aio(job_id):
                        state = await jc.get.aio(job_id)
                        if state != last_state:
                            last_state = state
                            await websocket.send_json(state)
                        status = state.get("status", "")
                        if status in ("completed", "failed", "canceled"):
                            break
                    else:
                        await websocket.send_json({"status": "not_found"})
                        break
                except Exception as e:
                    await websocket.send_json({"error": str(e)})
                await asyncio.sleep(1)
        except WebSocketDisconnect:
            pass
        finally:
            await websocket.close()

    @api.websocket("/ws/jobs/{job_id}/logs")
    async def ws_job_logs(websocket: WebSocket, job_id: str):
        await websocket.accept()
        log_path = f"/data/{job_id}/simulation.log"
        try:
            sent_lines = 0
            while True:
                try:
                    await vl.reload.aio()
                    if os.path.exists(log_path):
                        with open(log_path, "r", errors="replace") as f:
                            lines = f.readlines()
                        if len(lines) > sent_lines:
                            new_lines = lines[sent_lines:]
                            await websocket.send_json({"lines": [l.rstrip() for l in new_lines]})
                            sent_lines = len(lines)
                    if await jc.contains.aio(job_id):
                        state = await jc.get.aio(job_id)
                        if state.get("status") in ("completed", "failed", "canceled"):
                            break
                except Exception:
                    pass
                await asyncio.sleep(2)
        except WebSocketDisconnect:
            pass
        finally:
            await websocket.close()

    @api.get("/jobs/{job_id}/files/{filename}", summary="Get specific job file")
    async def get_job_file(job_id: str, filename: str):
        await vl.reload.aio()
        file_path = f"/data/{job_id}/{filename}"
        if os.path.exists(file_path):
            return FileResponse(file_path)
        return JSONResponse(status_code=404, content={"error": "File not found"})

    @api.get("/jobs/{job_id}/tar",
             summary="Get job results",
             description="Download job results as a tar.gz file")
    async def get_job(job_id:str):
        await vl.reload.aio()
        tar_path=f"/data/{job_id}/md.tar.gz"
        if os.path.exists(tar_path):
            return FileResponse(tar_path,media_type="application/gzip",filename=f"md_{job_id}.tar.gz")
    return api
