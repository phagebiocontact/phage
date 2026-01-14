import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { FileCode2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { convex } from "@/lib/convex";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/simulate")({
	component: Simulate,
});

const SimulateContentInner = ({
	user,
	updateCredits,
}: {
	user: any;
	updateCredits: any;
}) => {
	const navigate = useNavigate();
	const [proteinFile, setProteinFile] = useState<File | null>(null);
	const [ligandFile, setLigandFile] = useState<File | null>(null);
	const [parameters, setParameters] = useState({
		title: "",
		description: "",
		simulationTime: 100,
		temperature: 300,
		pressure: 1,
		timestep: 2,
	});
	const [enableEquilibration, setEnableEquilibration] = useState(true);
	const [equilibrationParameters, setEquilibrationParameters] = useState({
		time: 10,
		temperature: 300,
		pressure: 1,
		timestep: 2,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const createSimulation = useMutation(api.simulations.createSimulation);
	const creditsNeeded = parameters.simulationTime;
	const _estimatedCost = (creditsNeeded / 20).toFixed(2);

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
			await createSimulation({
				name: parameters.title,
				parameters: {
					temperature: parameters.temperature,
					duration: parameters.simulationTime,
					timestep: parameters.timestep,
					ensemble: "NVT",
				},
				equilibration: enableEquilibration
					? {
							enabled: true,
							time: equilibrationParameters.time,
							temperature: equilibrationParameters.temperature,
							pressure: equilibrationParameters.pressure,
							timestep: equilibrationParameters.timestep,
						}
					: {
							enabled: false,
						},
				pdbFile: proteinFile.name,
				sdfFile: ligandFile?.name,
				creditsUsed: creditsNeeded,
			});
			updateCredits(-creditsNeeded);
			toast.success("Simulation started successfully!");
			navigate({ to: "/jobs" });
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
						<Label htmlFor="title">Simulation Title *</Label>
						<Input
							id="title"
							onChange={(e) =>
								setParameters({ ...parameters, title: e.target.value })
							}
							placeholder="e.g., Protein-Ligand Binding Study"
							required
							value={parameters.title}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="description">Description (Optional)</Label>
						<Textarea
							id="description"
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
						<Label>Protein Structure (PDB) *</Label>
						<FileUploadZone accept=".pdb" file={proteinFile} type="protein" />
					</div>
					<div className="space-y-2">
						<Label>Ligand Structure (SDF) - Optional</Label>
						<FileUploadZone accept=".sdf" file={ligandFile} type="ligand" />
					</div>
				</CardContent>
			</Card>
			<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
				<CardHeader>
					<CardTitle>Simulation Parameters</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="simulationTime">
								Simulation Time (nanoseconds) *
							</Label>
							<Input
								id="simulationTime"
								min="1"
								onChange={(e) =>
									setParameters({
										...parameters,
										simulationTime: Number.parseInt(e.target.value, 10) || 1,
									})
								}
								required
								type="number"
								value={parameters.simulationTime}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="temperature">Temperature (K) *</Label>
							<Input
								id="temperature"
								min="0"
								onChange={(e) =>
									setParameters({
										...parameters,
										temperature: Number.parseInt(e.target.value, 10) || 0,
									})
								}
								required
								type="number"
								value={parameters.temperature}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="pressure">Pressure (bar) *</Label>
							<Input
								id="pressure"
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
							<Label htmlFor="timestep">Time Step (fs) *</Label>
							<Input
								id="timestep"
								min="2"
								onChange={(e) =>
									setParameters({
										...parameters,
										timestep: Number.parseFloat(e.target.value) || 2,
									})
								}
								required
								step="1"
								type="number"
								value={parameters.timestep}
							/>
						</div>
					</div>
				</CardContent>
			</Card>
			<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
				<CardHeader>
					<div className="flex items-center gap-2">
						<input
							checked={enableEquilibration}
							className="h-4 w-4 cursor-pointer rounded border-border"
							id="enableEquilibration"
							onChange={(e) => setEnableEquilibration(e.target.checked)}
							type="checkbox"
						/>
						<CardTitle
							className="cursor-pointer"
							onClick={() => setEnableEquilibration(!enableEquilibration)}
						>
							Equilibration Phase (Optional)
						</CardTitle>
					</div>
				</CardHeader>
				{enableEquilibration && (
					<CardContent className="space-y-4">
						<p className="text-muted-foreground text-sm">
							Configure separate parameters for the equilibration phase before
							the main simulation.
						</p>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="equilibrationTime">
									Equilibration Time (nanoseconds)
								</Label>
								<Input
									id="equilibrationTime"
									min="0.1"
									onChange={(e) =>
										setEquilibrationParameters({
											...equilibrationParameters,
											time: Number.parseFloat(e.target.value) || 0,
										})
									}
									step="0.1"
									type="number"
									value={equilibrationParameters.time}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="equilibrationTemp">Temperature (K)</Label>
								<Input
									id="equilibrationTemp"
									min="0"
									onChange={(e) =>
										setEquilibrationParameters({
											...equilibrationParameters,
											temperature: Number.parseInt(e.target.value, 10) || 0,
										})
									}
									type="number"
									value={equilibrationParameters.temperature}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="equilibrationPressure">Pressure (bar)</Label>
								<Input
									id="equilibrationPressure"
									min="0"
									onChange={(e) =>
										setEquilibrationParameters({
											...equilibrationParameters,
											pressure: Number.parseFloat(e.target.value) || 0,
										})
									}
									step="0.1"
									type="number"
									value={equilibrationParameters.pressure}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="equilibrationTimestep">Time Step (fs)</Label>
								<Input
									id="equilibrationTimestep"
									min="2"
									onChange={(e) =>
										setEquilibrationParameters({
											...equilibrationParameters,
											timestep: Number.parseFloat(e.target.value) || 0,
										})
									}
									step="1"
									type="number"
									value={equilibrationParameters.timestep}
								/>
							</div>
						</div>
					</CardContent>
				)}
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
	const { user, updateCredits } = useAuth();
	return (
		<div className="min-h-screen bg-background">
			<section className="pt-32 pb-12">
				<div className="container mx-auto px-4">
					<div className="mx-auto max-w-5xl">
						<div className="mb-8 animate-fade-in">
							<h1 className="mb-4 font-bold text-4xl md:text-5xl">
								New{" "}
								<span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
									Simulation
								</span>
							</h1>
							<p className="text-muted-foreground text-xl">
								Configure and launch your molecular dynamics simulation
							</p>
						</div>
						{convex ? (
							<SimulateContentInner user={user} updateCredits={updateCredits} />
						) : (
							<Card className="border-border/40 bg-card/50 backdrop-blur-sm p-12 text-center">
								<p className="text-muted-foreground">
									Backend connection is currently unavailable. Please check your
									configuration.
								</p>
							</Card>
						)}
					</div>
				</div>
			</section>
		</div>
	);
}
