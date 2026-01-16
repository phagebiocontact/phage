import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { AlertCircle, CheckCircle2, Clock, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { convex } from "@/lib/convex";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/jobs")({
	component: Jobs,
});

const JobsContentInner = ({ user }: { user: any }) => {
	const navigate = useNavigate();
	const jobs = useQuery(api.simulations.getUserSimulations, user ? {} : "skip");
	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
			case "running":
				return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 animate-pulse";
			case "failed":
				return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
			case "pending":
				return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
			default:
				return "bg-gray-500/10 text-gray-500";
		}
	};
	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle2 className="h-4 w-4" />;
			case "running":
				return <Clock className="h-4 w-4 animate-spin" />;
			case "failed":
				return <AlertCircle className="h-4 w-4" />;
			default:
				return <Clock className="h-4 w-4" />;
		}
	};
	if (!user) {
		return (
			<div className="flex h-[calc(100vh-200px)] items-center justify-center">
				<div className="text-center">
					<h2 className="mb-2 font-bold text-2xl">Sign In Required</h2>
					<p className="text-muted-foreground">
						Please sign in to view your simulation jobs.
					</p>
				</div>
			</div>
		);
	}
	return (
		<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
			<CardHeader>
				<CardTitle>Recent Activity</CardTitle>
				<CardDescription>
					A list of your recent simulation jobs and their current status.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{!jobs ? (
					<div className="flex justify-center p-8">
						<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
					</div>
				) : jobs.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<Terminal className="mb-4 h-12 w-12 text-muted-foreground/50" />
						<h3 className="mb-2 font-semibold text-lg">No jobs found</h3>
						<p className="mb-6 max-w-sm text-muted-foreground">
							You haven't run any simulations yet. Start your first job to see
							it here.
						</p>
						<Button onClick={() => navigate({ to: "/simulate" })}>
							Start Simulation
						</Button>
					</div>
				) : (
					<div className="rounded-md border border-border/40">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Job Name</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Progress</TableHead>
									<TableHead className="hidden md:table-cell">
										Duration
									</TableHead>
									<TableHead className="hidden md:table-cell">
										Created
									</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{jobs.map((job: any) => (
									<TableRow 
										key={job._id}
										className="cursor-pointer hover:bg-muted/50"
										onClick={() => navigate({ to: `/results/${job._id}` })}
									>
										<TableCell className="font-medium">
											<div>
												{job.name}
												<div className="text-muted-foreground text-xs md:hidden">
													{format(new Date(job.createdAt), "MMM d, yyyy")}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge
												className={`flex w-fit items-center gap-1 ${getStatusColor(job.status)}`}
												variant="outline"
											>
												{getStatusIcon(job.status)}
												<span className="capitalize">{job.status}</span>
											</Badge>
										</TableCell>
										<TableCell className="w-[140px]">
											{job.status === "running" ? (
												<div className="space-y-1">
													<Progress className="h-2" value={job.progress || 0} />
													<p className="text-right text-muted-foreground text-xs">
														{job.progress || 0}%
													</p>
												</div>
											) : job.status === "completed" ? (
												<Progress className="h-2" value={100} />
											) : (
												<Progress className="h-2" value={0} />
											)}
										</TableCell>
										<TableCell className="hidden md:table-cell">
											{job.parameters?.duration}ns
										</TableCell>
										<TableCell className="hidden md:table-cell">
											{format(new Date(job.createdAt), "MMM d, HH:mm")}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													size="sm"
													variant="outline"
													className="h-8"
													onClick={(e) => {
														e.stopPropagation();
														navigate({ to: `/results/${job._id}` });
													}}
												>
													View
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

function Jobs() {
	const { user } = useAuth();
	const navigate = useNavigate();
	return (
		<div className="min-h-screen bg-background">
			<section className="pt-32 pb-12">
				<div className="container mx-auto px-4">
					<div className="mb-8 flex items-center justify-between">
						<div>
							<h1 className="mb-2 font-bold text-3xl md:text-4xl">
								Simulation <span className="text-primary">Jobs</span>
							</h1>
							<p className="text-muted-foreground">
								Manage and monitor your molecular dynamics simulations
							</p>
						</div>
						<Button
							onClick={() => navigate({ to: "/simulate" })}
							className="hidden bg-gradient-primary shadow-glow md:flex"
						>
							New Simulation
						</Button>
					</div>
					{convex ? (
						<JobsContentInner user={user} />
					) : (
						<Card className="border-border/40 bg-card/50 backdrop-blur-sm p-12 text-center">
							<p className="text-muted-foreground">
								Backend connection is currently unavailable. Please check your
								configuration.
							</p>
						</Card>
					)}
				</div>
			</section>
		</div>
	);
}
