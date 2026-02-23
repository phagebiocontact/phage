import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { FileCode2, Info, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useId } from "react";
import { useAuth } from "@/lib/auth";
import { convex } from "@/lib/convex";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/simulate")({
	component: Simulate,
});

const InfoTooltip = ({ content }: { content: string }) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<Info className="ml-1.5 inline-block h-3.5 w-3.5 cursor-help text-muted-foreground opacity-70 transition-opacity hover:opacity-100" />
		</TooltipTrigger>
		<TooltipContent side="right">
			<p className="max-w-[200px]">{content}</p>
		</TooltipContent>
	</Tooltip>
);

const SimulateContentInner = ({ user }: { user: any }) => {
	const navigate = useNavigate();
	const titleId = useId();
	const descriptionId = useId();
	const temperatureId = useId();
	const pressureId = useId();
	const phId = useId();
	const ionicId = useId();
	const paddingId = useId();
	const timestepId = useId();
	const hmrId = useId();
	const equilTimeId = useId();
	const prodTimeId = useId();

	const [proteinFile, setProteinFile] = useState<File | null>(null);
	const [ligandFile, setLigandFile] = useState<File | null>(null);
	const [parameters, setParameters] = useState({
		title: "",
		description: "",
		simulationTime: 10,
		temperature: 300,
		pressure: 1.0,
		timestep: 4,
		forcefield: "amber19",
		solvationModel: "opc",
		ph: 7.4,
		ionicStrength: 0.15,
		padding: 1.0,
		hmr: true,
	});
	const [equilibrationTime, setEquilibrationTime] = useState(1.0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const createSimulation = useMutation(api.simulations.createSimulation);
	const generateUploadUrl = useMutation(api.simulations.generateUploadUrl);
	const creditsNeeded = parameters.simulationTime + equilibrationTime;
	const _estimatedCost = (creditsNeeded / 20).toFixed(2);

	useEffect(() => {
		setParameters((prev) => ({
			...prev,
			timestep: parameters.hmr ? 4 : 2,
		}));
	}, [parameters.hmr]);

	const handleFileUpload = (file: File, type: "protein" | "ligand") => {
		if (file.size > 10 * 1024 * 1024) {
			toast.error("File size must be less than 10MB");
			return;
		}
		const validExtensions = type === "protein" ? [".pdb"] : [".sdf"];
		const fileExtension = file.name
			.toLowerCase()
			.substring(file.name.lastIndexOf("."));
		if (!validExtensions.includes(fileExtension)) {
			toast.error(`Please upload a ${validExtensions.join(" or ")} file`);
			return;
		}
		if (type === "protein") {
			setProteinFile(file);
			toast.success("Protein file uploaded successfully");
		} else {
			setLigandFile(file);
			toast.success("Ligand file uploaded successfully");
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: React.DragEvent, type: "protein" | "ligand") => {
		e.preventDefault();
		e.stopPropagation();
		const files = e.dataTransfer.files;
		if (files.length > 0) {
			handleFileUpload(files[0], type);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) {
			toast.error("Please sign in to start a simulation");
			navigate({ to: "/auth" });
			return;
		}
		if (!proteinFile) {
			toast.error("Please upload a protein file");
			return;
		}
		if ((user.credits || 0) < creditsNeeded) {
			toast.error(
				`Insufficient credits. You need ${creditsNeeded} credits but have ${user.credits || 0}`,
			);
			navigate({ to: "/pricing" });
			return;
		}
		setIsSubmitting(true);
		try {
			// Upload protein file to Convex storage
			const uploadUrl = await generateUploadUrl();
			const result = await fetch(uploadUrl, {
				method: "POST",
				body: proteinFile,
			});

			if (!result.ok) {
				throw new Error(`Protein upload failed: ${result.statusText}`);
			}
			const { storageId: proteinStorageId } = await result.json();

			// Upload ligand file if present
			let ligandStorageId;
			if (ligandFile) {
				const ligandUploadUrl = await generateUploadUrl();
				const ligandResult = await fetch(ligandUploadUrl, {
					method: "POST",
					body: ligandFile,
				});
				if (!ligandResult.ok) {
					throw new Error(`Ligand upload failed: ${ligandResult.statusText}`);
				}
				const { storageId } = await ligandResult.json();
				ligandStorageId = storageId;
			}

			// Create simulation (credits are reserved now, captured on success)
			const simulationId = await createSimulation({
				name: parameters.title,
				parameters: {
					temperature: parameters.temperature,
					pressure: parameters.pressure,
					duration: parameters.simulationTime,
					timestep: parameters.timestep,
					ensemble: "NVT",
					forcefield: parameters.forcefield,
					solvationModel: parameters.solvationModel,
					ph: parameters.ph,
					hmr: parameters.hmr,
					padding: parameters.padding,
					ionicStrength: parameters.ionicStrength,
					minimizationSteps: 100,
				},
				equilibration: {
					time: equilibrationTime,
				},
				proteinStorageId,
				ligandStorageId,
				creditsToReserve: creditsNeeded,
			});

			toast.success("Simulation submitted! Credits will be deducted on completion.");
			navigate({ to: `/results/${simulationId}` });
		} catch (error) {
			console.error("Error creating simulation:", error);
			toast.error("Failed to start simulation. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};



	const FileUploadZone = ({
		type,
		file,
		accept,
	}: {
		type: "protein" | "ligand";
		file: File | null;
		accept: string;
	}) => (
		<div
			className="group relative cursor-pointer rounded-lg border-2 border-border/60 border-dashed p-8 text-center transition-colors hover:border-primary/50"
			onDragOver={handleDragOver}
			onDrop={(e) => handleDrop(e, type)}
		>
			<input
				accept={accept}
				className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
				onChange={(e) =>
					e.target.files && handleFileUpload(e.target.files[0], type)
				}
				type="file"
			/>
			<div className="space-y-4">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-glow transition-transform group-hover:scale-110">
					{file ? (
						<FileCode2 className="h-8 w-8 text-white" />
					) : (
						<Upload className="h-8 w-8 text-white" />
					)}
				</div>
				{file ? (
					<div>
						<p className="font-semibold">{file.name}</p>
						<p className="text-muted-foreground text-sm">
							{(file.size / 1024).toFixed(2)} KB
						</p>
					</div>
				) : (
					<div>
						<p className="font-semibold">Drop your {type} file here</p>
						<p className="text-muted-foreground text-sm">or click to browse</p>
						<p className="mt-2 text-muted-foreground text-xs">
							{accept.toUpperCase()} • Max 10MB
						</p>
					</div>
				)}
			</div>
		</div>
	);

	return (
		<form className="space-y-6" onSubmit={handleSubmit}>
			<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
				<CardHeader>
					<CardTitle>Simulation Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor={titleId} className="flex items-center">
							Simulation Title *
							<InfoTooltip content="A unique name for your simulation run." />
						</Label>
						<Input
							id={titleId}
							onChange={(e) =>
								setParameters({ ...parameters, title: e.target.value })
							}
							placeholder="e.g., Protein-Ligand Binding Study"
							required
							value={parameters.title}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={descriptionId} className="flex items-center">
							Description (Optional)
							<InfoTooltip content="Optional notes or details about this specific simulation." />
						</Label>
						<Textarea
							id={descriptionId}
							onChange={(e) =>
								setParameters({
									...parameters,
									description: e.target.value,
								})
							}
							placeholder="Add notes about your simulation..."
							rows={3}
							value={parameters.description}
						/>
					</div>
				</CardContent>
			</Card>
			<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
				<CardHeader>
					<CardTitle>Upload Files</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label className="flex items-center">
							Protein Structure (PDB) *
							<InfoTooltip content="PDB file containing the protein's coordinate and structural information." />
						</Label>
						<FileUploadZone accept=".pdb" file={proteinFile} type="protein" />
					</div>
					<div className="space-y-2">
						<Label className="flex items-center">
							Ligand Structure (SDF) - Optional
							<InfoTooltip content="SDF file for the small molecule ligand (optional)." />
						</Label>
						<FileUploadZone accept=".sdf" file={ligandFile} type="ligand" />
					</div>
				</CardContent>
			</Card>
			<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
				<CardHeader>
					<CardTitle>System Parameters</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="forcefield" className="flex items-center">
								Forcefield
								<InfoTooltip content="A mathematical model used to calculate the potential energy of the molecular system." />
							</Label>
							<Select
								onValueChange={(value) =>
									setParameters({ ...parameters, forcefield: value })
								}
								value={parameters.forcefield}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select Forcefield" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="amber19">amber19</SelectItem>
									<SelectItem value="charmm36m">charmm36m</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="solvationModel" className="flex items-center">
								Solvation Model
								<InfoTooltip content="Water model used to simulate the aqueous environment (OPC, TIP3P, etc.)." />
							</Label>
							<Select
								onValueChange={(value) =>
									setParameters({ ...parameters, solvationModel: value })
								}
								value={parameters.solvationModel}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select Solvation Model" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="opc">opc</SelectItem>
									<SelectItem value="charmm-modified-tip3p">
										charmm-modified-tip3p
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor={temperatureId} className="flex items-center">
								Temperature (K)
								<InfoTooltip content="Target temperature in Kelvin." />
							</Label>
							<Input
								id={temperatureId}
								min="0"
								onChange={(e) =>
									setParameters({
										...parameters,
										temperature: Number.parseFloat(e.target.value) || 0,
									})
								}
								required
								step="0.1"
								type="number"
								value={parameters.temperature}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={pressureId} className="flex items-center">
								Pressure (bar)
								<InfoTooltip content="Target pressure in bars (1.0 bar = atm)." />
							</Label>
							<Input
								id={pressureId}
								min="0"
								onChange={(e) =>
									setParameters({
										...parameters,
										pressure: Number.parseFloat(e.target.value) || 0,
									})
								}
								required
								step="0.1"
								type="number"
								value={parameters.pressure}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={phId} className="flex items-center">
								pH
								<InfoTooltip content="The acidity/alkalinity level for determining residue protonation states." />
							</Label>
							<Input
								id={phId}
								min="0"
								max="14"
								onChange={(e) =>
									setParameters({
										...parameters,
										ph: Number.parseFloat(e.target.value) || 7.0,
									})
								}
								required
								step="0.1"
								type="number"
								value={parameters.ph}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={ionicId} className="flex items-center">
								Ionic Strength (mol/L)
								<InfoTooltip content="The concentration of salt (NaCl) in the solvent box." />
							</Label>
							<Input
								id={ionicId}
								min="0"
								onChange={(e) =>
									setParameters({
										...parameters,
										ionicStrength: Number.parseFloat(e.target.value) || 0,
									})
								}
								required
								step="0.01"
								type="number"
								value={parameters.ionicStrength}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={paddingId} className="flex items-center">
								Box Padding (nm)
								<InfoTooltip content="The minimum distance between the solute and the box boundaries." />
							</Label>
							<Input
								id={paddingId}
								min="0.5"
								onChange={(e) =>
									setParameters({
										...parameters,
										padding: Number.parseFloat(e.target.value) || 1.0,
									})
								}
								required
								step="0.1"
								type="number"
								value={parameters.padding}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={equilTimeId} className="flex items-center">
								Equilibration Time (ns)
								<InfoTooltip content="Duration of the initial phase used to stabilize system energy, density, and temperature." />
							</Label>
							<Input
								id={equilTimeId}
								min="0"
								onChange={(e) =>
									setEquilibrationTime(Number.parseFloat(e.target.value) || 0)
								}
								step="0.1"
								type="number"
								value={equilibrationTime}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={prodTimeId} className="flex items-center">
								Production Time (ns)
								<InfoTooltip content="Duration of the main simulation phase during which data is collected for analysis." />
							</Label>
							<Input
								id={prodTimeId}
								min="0.1"
								onChange={(e) =>
									setParameters({
										...parameters,
										simulationTime: Number.parseFloat(e.target.value) || 0.1,
									})
								}
								required
								step="0.1"
								type="number"
								value={parameters.simulationTime}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={timestepId} className="flex items-center">
								Time Step (fs)
								<InfoTooltip content="The discrete time interval for integrating Newton's equations of motion." />
							</Label>
							<Input
								id={timestepId}
								disabled
								value={parameters.timestep}
								readOnly
							/>
							<p className="text-[0.8rem] text-muted-foreground">
								Automatically set based on HMR setting (4fs with HMR, 2fs without).
							</p>
						</div>
					</div>
					<div className="flex items-center space-x-2 pt-4">
						<input
							checked={parameters.hmr}
							className="h-4 w-4 cursor-pointer rounded border-border"
							id={hmrId}
							onChange={(e) =>
								setParameters({
									...parameters,
									hmr: e.target.checked,
								})
							}
							type="checkbox"
						/>
						<Label htmlFor={hmrId} className="flex cursor-pointer items-center">
							Hydrogen Mass Repartitioning (HMR) - Enables 4fs timestep
							<InfoTooltip content="Hydrogen Mass Repartitioning: redistributes mass to allow for 4fs timesteps, doubling simulation speed." />
						</Label>
					</div>
				</CardContent>
			</Card>


			<div className="flex items-center justify-end gap-4 p-4">
				<div className="text-right">
					<p className="font-semibold">{creditsNeeded} Credits</p>
					<p className="text-muted-foreground text-xs">
						Estimated Cost ~${_estimatedCost}
					</p>
				</div>
				<Button
					size="lg"
					className="bg-gradient-primary shadow-glow min-w-[150px]"
					disabled={isSubmitting}
					type="submit"
				>
					{isSubmitting ? "Starting..." : "Design & Launch"}
				</Button>
			</div>
		</form>
	);
};

function Simulate() {
	const { user } = useAuth();
	return (
		<div className="fusion-canvas min-h-screen bg-background">
			<section className="pt-32 pb-12">
				<div className="container mx-auto px-4">
					<div className="mx-auto max-w-5xl">
						<div className="mb-8 animate-fade-in">
							<h1 className="mb-4 font-bold text-4xl md:text-5xl">
								New{" "}
								<span className="text-gradient">
									Simulation
								</span>
							</h1>
							<p className="text-muted-foreground text-xl">
								Configure and launch your molecular dynamics simulation
							</p>
						</div>
						<TooltipProvider>
							{convex ? (
								<SimulateContentInner user={user} />
							) : (
								<Card className="border-border/40 bg-card/50 backdrop-blur-sm p-12 text-center">
									<p className="text-muted-foreground">
										Backend connection is currently unavailable. Please check your
										configuration.
									</p>
								</Card>
							)}
						</TooltipProvider>
					</div>
				</div>
			</section>
		</div>
	);
}