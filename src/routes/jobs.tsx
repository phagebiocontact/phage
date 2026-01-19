import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
	type VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import {
	AlertCircle,
	ArrowUpDown,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	ChevronsLeft,
	ChevronsRight,
	Eye,
	Search,
	Terminal,
	X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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

type Job = {
	_id: string;
	name: string;
	status: string;
	progress?: number;
	createdAt: number;
	parameters?: {
		duration?: number;
	};
};

const getStatusColor = (status: string) => {
	switch (status) {
		case "completed":
			return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25";
		case "running":
			return "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25";
		case "failed":
			return "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25";
		case "pending":
			return "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25";
		default:
			return "bg-gray-500/15 text-gray-400 border-gray-500/30";
	}
};

const getStatusIcon = (status: string) => {
	switch (status) {
		case "completed":
			return <CheckCircle2 className="h-3.5 w-3.5" />;
		case "running":
			return <Clock className="h-3.5 w-3.5 animate-spin" />;
		case "failed":
			return <AlertCircle className="h-3.5 w-3.5" />;
		default:
			return <Clock className="h-3.5 w-3.5" />;
	}
};

const JobsContentInner = ({ user }: { user: any }) => {
	const navigate = useNavigate();
	const jobs = useQuery(api.simulations.getUserSimulations, user ? {} : "skip");

	const [sorting, setSorting] = useState<SortingState>([
		{ id: "createdAt", desc: true },
	]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [globalFilter, setGlobalFilter] = useState("");

	const columns = useMemo<ColumnDef<Job>[]>(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="h-auto p-0 hover:bg-transparent font-semibold"
					>
						Job Name
						<ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
					</Button>
				),
				cell: ({ row }) => (
					<div className="flex flex-col gap-1">
						<span className="font-medium text-foreground">
							{row.getValue("name")}
						</span>
						<span className="text-xs text-muted-foreground md:hidden">
							{format(new Date(row.original.createdAt), "MMM d, yyyy")}
						</span>
					</div>
				),
			},
			{
				accessorKey: "status",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="h-auto p-0 hover:bg-transparent font-semibold"
					>
						Status
						<ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
					</Button>
				),
				cell: ({ row }) => {
					const status = row.getValue("status") as string;
					return (
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.2 }}
						>
							<Badge
								className={`flex w-fit items-center gap-1.5 px-2.5 py-1 border ${getStatusColor(status)} transition-all duration-300`}
								variant="outline"
							>
								{getStatusIcon(status)}
								<span className="capitalize font-medium">{status}</span>
							</Badge>
						</motion.div>
					);
				},
				filterFn: (row, id, value) => {
					return value.includes(row.getValue(id));
				},
			},
			{
				accessorKey: "progress",
				header: "Progress",
				cell: ({ row }) => {
					const status = row.original.status;
					const progress = row.original.progress || 0;
					return (
						<div className="w-[120px]">
							{status === "running" ? (
								<div className="space-y-1.5">
									<div className="relative">
										<Progress
											className="h-2 bg-muted/50"
											value={progress}
										/>
										<motion.div
											className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
											animate={{ x: ["-100%", "100%"] }}
											transition={{
												duration: 1.5,
												repeat: Number.POSITIVE_INFINITY,
												ease: "linear",
											}}
										/>
									</div>
									<p className="text-right text-xs text-muted-foreground font-medium">
										{progress}%
									</p>
								</div>
							) : status === "completed" ? (
								<div className="flex items-center gap-2">
									<Progress className="h-2 bg-muted/50" value={100} />
									<CheckCircle2 className="h-4 w-4 text-emerald-400" />
								</div>
							) : status === "failed" ? (
								<div className="flex items-center gap-2">
									<Progress className="h-2 bg-muted/50" value={0} />
									<X className="h-4 w-4 text-red-400" />
								</div>
							) : (
								<Progress className="h-2 bg-muted/50" value={0} />
							)}
						</div>
					);
				},
			},
			{
				accessorKey: "duration",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="h-auto p-0 hover:bg-transparent font-semibold hidden md:flex"
					>
						Duration
						<ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
					</Button>
				),
				accessorFn: (row) => row.parameters?.duration,
				cell: ({ row }) => (
					<span className="hidden md:inline text-muted-foreground">
						{row.original.parameters?.duration}ns
					</span>
				),
			},
			{
				accessorKey: "createdAt",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="h-auto p-0 hover:bg-transparent font-semibold hidden md:flex"
					>
						Created
						<ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
					</Button>
				),
				cell: ({ row }) => (
					<span className="hidden md:inline text-muted-foreground">
						{format(new Date(row.getValue("createdAt")), "MMM d, HH:mm")}
					</span>
				),
			},
			{
				id: "actions",
				header: () => <span className="sr-only">Actions</span>,
				cell: ({ row }) => (
					<div className="flex justify-end">
						<Button
							size="sm"
							variant="outline"
							className="h-8 gap-2 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300"
							onClick={(e) => {
								e.stopPropagation();
								navigate({ to: `/results/${row.original._id}` });
							}}
						>
							<Eye className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">View</span>
						</Button>
					</div>
				),
			},
		],
		[navigate],
	);

	const table = useReactTable({
		data: (jobs as Job[]) || [],
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			globalFilter,
		},
		initialState: {
			pagination: {
				pageSize: 10,
			},
		},
	});

	const statusCounts = useMemo(() => {
		if (!jobs) return { all: 0, completed: 0, running: 0, pending: 0, failed: 0 };
		const counts = {
			all: jobs.length,
			completed: 0,
			running: 0,
			pending: 0,
			failed: 0,
		};
		for (const job of jobs) {
			if (job.status === "completed") counts.completed++;
			else if (job.status === "running") counts.running++;
			else if (job.status === "pending") counts.pending++;
			else if (job.status === "failed") counts.failed++;
		}
		return counts;
	}, [jobs]);

	if (!user) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex h-[calc(100vh-200px)] items-center justify-center"
			>
				<div className="text-center">
					<h2 className="mb-2 font-bold text-2xl">Sign In Required</h2>
					<p className="text-muted-foreground">
						Please sign in to view your simulation jobs.
					</p>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
				<CardHeader className="border-b border-border/40 bg-muted/20">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<CardTitle className="text-xl">Recent Activity</CardTitle>
							<CardDescription>
								A list of your recent simulation jobs and their current status.
							</CardDescription>
						</div>
						{/* Status filter pills */}
						<div className="flex flex-wrap gap-2">
							{[
								{ key: "all", label: "All", count: statusCounts.all },
								{ key: "running", label: "Running", count: statusCounts.running },
								{ key: "completed", label: "Completed", count: statusCounts.completed },
								{ key: "pending", label: "Pending", count: statusCounts.pending },
								{ key: "failed", label: "Failed", count: statusCounts.failed },
							].map((filter) => {
								const isActive =
									filter.key === "all"
										? !table.getColumn("status")?.getFilterValue()
										: (table.getColumn("status")?.getFilterValue() as string[] | undefined)?.includes(filter.key);
								return (
									<motion.button
										key={filter.key}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={() => {
											if (filter.key === "all") {
												table.getColumn("status")?.setFilterValue(undefined);
											} else {
												table.getColumn("status")?.setFilterValue([filter.key]);
											}
										}}
										className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1.5 ${isActive
												? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
												: "bg-muted/50 text-muted-foreground hover:bg-muted"
											}`}
									>
										{filter.label}
										<span
											className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive
													? "bg-primary-foreground/20"
													: "bg-background/50"
												}`}
										>
											{filter.count}
										</span>
									</motion.button>
								);
							})}
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{!jobs ? (
						<div className="flex justify-center p-12">
							<div className="relative">
								<div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="h-6 w-6 rounded-full bg-primary/20 animate-pulse" />
								</div>
							</div>
						</div>
					) : jobs.length === 0 ? (
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							className="flex flex-col items-center justify-center py-16 text-center"
						>
							<div className="mb-6 p-4 rounded-full bg-muted/50">
								<Terminal className="h-12 w-12 text-muted-foreground/50" />
							</div>
							<h3 className="mb-2 font-semibold text-lg">No jobs found</h3>
							<p className="mb-6 max-w-sm text-muted-foreground">
								You haven't run any simulations yet. Start your first job to see
								it here.
							</p>
							<Button
								onClick={() => navigate({ to: "/simulate" })}
								className="bg-gradient-primary shadow-glow"
							>
								Start Simulation
							</Button>
						</motion.div>
					) : (
						<>
							{/* Search bar */}
							<div className="p-4 border-b border-border/40">
								<div className="relative max-w-sm">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search jobs..."
										value={globalFilter ?? ""}
										onChange={(e) => setGlobalFilter(e.target.value)}
										className="pl-9 bg-muted/30 border-border/50 focus:border-primary/50 transition-colors"
									/>
									{globalFilter && (
										<button
											onClick={() => setGlobalFilter("")}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
										>
											<X className="h-4 w-4" />
										</button>
									)}
								</div>
							</div>

							{/* Table */}
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										{table.getHeaderGroups().map((headerGroup) => (
											<TableRow
												key={headerGroup.id}
												className="bg-muted/30 hover:bg-muted/30 border-b border-border/40"
											>
												{headerGroup.headers.map((header) => (
													<TableHead
														key={header.id}
														className="text-muted-foreground font-semibold"
													>
														{header.isPlaceholder
															? null
															: flexRender(
																header.column.columnDef.header,
																header.getContext(),
															)}
													</TableHead>
												))}
											</TableRow>
										))}
									</TableHeader>
									<TableBody>
										<AnimatePresence mode="popLayout">
											{table.getRowModel().rows.length ? (
												table.getRowModel().rows.map((row, index) => (
													<motion.tr
														key={row.id}
														initial={{ opacity: 0, y: 10 }}
														animate={{ opacity: 1, y: 0 }}
														exit={{ opacity: 0, y: -10 }}
														transition={{ duration: 0.2, delay: index * 0.03 }}
														className="group cursor-pointer border-b border-border/30 hover:bg-primary/5 transition-colors duration-200"
														onClick={() =>
															navigate({ to: `/results/${row.original._id}` })
														}
													>
														{row.getVisibleCells().map((cell) => (
															<TableCell key={cell.id} className="py-4">
																{flexRender(
																	cell.column.columnDef.cell,
																	cell.getContext(),
																)}
															</TableCell>
														))}
													</motion.tr>
												))
											) : (
												<TableRow>
													<TableCell
														colSpan={columns.length}
														className="h-24 text-center"
													>
														<div className="text-muted-foreground">
															No results found.
														</div>
													</TableCell>
												</TableRow>
											)}
										</AnimatePresence>
									</TableBody>
								</Table>
							</div>

							{/* Pagination */}
							<div className="flex flex-col gap-4 p-4 border-t border-border/40 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<span>
										Showing{" "}
										<span className="font-medium text-foreground">
											{table.getState().pagination.pageIndex *
												table.getState().pagination.pageSize +
												1}
										</span>{" "}
										to{" "}
										<span className="font-medium text-foreground">
											{Math.min(
												(table.getState().pagination.pageIndex + 1) *
												table.getState().pagination.pageSize,
												table.getFilteredRowModel().rows.length,
											)}
										</span>{" "}
										of{" "}
										<span className="font-medium text-foreground">
											{table.getFilteredRowModel().rows.length}
										</span>{" "}
										jobs
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Select
										value={String(table.getState().pagination.pageSize)}
										onValueChange={(value) => table.setPageSize(Number(value))}
									>
										<SelectTrigger className="h-8 w-[70px] bg-muted/30">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{[5, 10, 20, 50].map((pageSize) => (
												<SelectItem key={pageSize} value={String(pageSize)}>
													{pageSize}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<div className="flex items-center gap-1">
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											onClick={() => table.setPageIndex(0)}
											disabled={!table.getCanPreviousPage()}
										>
											<ChevronsLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											onClick={() => table.previousPage()}
											disabled={!table.getCanPreviousPage()}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<div className="flex items-center gap-1 px-2">
											<span className="text-sm text-muted-foreground">
												Page{" "}
												<span className="font-medium text-foreground">
													{table.getState().pagination.pageIndex + 1}
												</span>{" "}
												of{" "}
												<span className="font-medium text-foreground">
													{table.getPageCount()}
												</span>
											</span>
										</div>
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											onClick={() => table.nextPage()}
											disabled={!table.getCanNextPage()}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											onClick={() => table.setPageIndex(table.getPageCount() - 1)}
											disabled={!table.getCanNextPage()}
										>
											<ChevronsRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
};

function Jobs() {
	const { user } = useAuth();
	const navigate = useNavigate();
	return (
		<div className="min-h-screen bg-background">
			<section className="pt-32 pb-12">
				<div className="container mx-auto px-4">
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4 }}
						className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
					>
						<div>
							<h1 className="mb-2 font-bold text-3xl md:text-4xl">
								Simulation <span className="text-gradient">Jobs</span>
							</h1>
							<p className="text-muted-foreground">
								Manage and monitor your molecular dynamics simulations
							</p>
						</div>
						<Button
							onClick={() => navigate({ to: "/simulate" })}
							className="bg-gradient-primary shadow-glow md:flex w-fit"
						>
							New Simulation
						</Button>
					</motion.div>
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
