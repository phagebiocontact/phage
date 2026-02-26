// Typed wrappers for the FastAPI MD simulation server
const MODAL_API_URL =
  (typeof process !== "undefined" && process.env.MODAL_API_URL) ||
  "https://greenrace66--md-fapi.modal.run";

export const ARTIFACT_FILENAMES = {
  structurePdb: "complex.pdb",
  trajectoryXtc: "prod.xtc",
  simulationLog: "simulation.log",
  rmsdCsv: "rmsd.csv",
  rmsfCsv: "rmsf.csv",
  ssCsv: "ss.csv",
  rgCsv: "rg.csv",
  energyCsv: "energy.csv",
  sasaCsv: "sasa.csv",
  rmsdPng: "rmsd.png",
  rmsfPng: "rmsf.png",
  ssPng: "ss.png",
  rgPng: "rg.png",
  energyPng: "energy.png",
  sasaPng: "sasa.png",
} as const;

export type ArtifactKey = keyof typeof ARTIFACT_FILENAMES;

export interface JobConfig {
  forcefield: string;
  solvation_model: string;
  ph: number;
  hmr: boolean;
  temperature_K: number;
  pressure_bar: number;
  timestep_fs: number;
  equilibration_time_ns: number;
  production_time_ns: number;
  padding_nm: number;
  ionic_strength_mol: number;
  minimization_max_steps: number;
}

export interface JobSubmitResult {
  job_id: string;
}

export type JobStatusValue =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export interface JobStatus {
  job_id: string;
  status: JobStatusValue;
  current_step?: string;
  progress_percent?: number;
  time_elapsed_seconds?: number;
  details?: string;
  error?: string;
  error_details?: string;
}

function getApiBase(): string {
  return MODAL_API_URL;
}

export async function apiSubmitJob(
  proteinBytes: ArrayBuffer,
  config: JobConfig,
  ligandBytes?: ArrayBuffer
): Promise<JobSubmitResult> {
  const formData = new FormData();
  formData.append(
    "protein",
    new Blob([proteinBytes], { type: "chemical/x-pdb" }),
    "protein.pdb"
  );
  formData.append(
    "config",
    new Blob([JSON.stringify(config)], { type: "application/json" }),
    "config.json"
  );
  if (ligandBytes) {
    formData.append(
      "ligand",
      new Blob([ligandBytes], { type: "chemical/x-mdl-sdfile" }),
      "ligand.sdf"
    );
  }

  const res = await fetch(`${getApiBase()}/jobs`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FastAPI /jobs failed ${res.status}: ${text}`);
  }

  return res.json() as Promise<JobSubmitResult>;
}

export async function apiGetJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${getApiBase()}/jobs/${jobId}/status`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FastAPI /status failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<JobStatus>;
}

export async function apiGetJobFile(
  jobId: string,
  filename: string
): Promise<ArrayBuffer> {
  const res = await fetch(
    `${getApiBase()}/jobs/${jobId}/files/${filename}`
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `FastAPI /files/${filename} failed ${res.status}: ${text}`
    );
  }
  return res.arrayBuffer();
}

export async function apiGetJobTar(jobId: string): Promise<ArrayBuffer> {
  const res = await fetch(`${getApiBase()}/jobs/${jobId}/tar`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FastAPI /tar failed ${res.status}: ${text}`);
  }
  return res.arrayBuffer();
}
