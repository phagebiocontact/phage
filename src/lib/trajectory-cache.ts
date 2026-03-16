export interface CachedFrame {
	slotIndex: number;
	sourceFrame: number;
	timeNs: number;
	progress: number;
	coords: Float32Array;
	rmsf: Float32Array;
	dssp: Float32Array;
	scalars: Record<string, number>;
}

const RING_BUFFER_BYTES = 128 * 1024 * 1024;

export class TrajectoryCache {
	private slotCount = 0;
	private frameSize = 0;
	private ring = false;
	private ringStorage: Float32Array | null = null;
	private ringMap = new Map<number, number>();
	private frames: Array<CachedFrame | null> = [];
	private order = 0;
	private count = 0;

	initialize(atomCount: number, slotCount: number) {
		this.slotCount = slotCount;
		this.frameSize = atomCount * 3;
		this.ring =
			this.frameSize * slotCount * Float32Array.BYTES_PER_ELEMENT >
			RING_BUFFER_BYTES;
		this.ringStorage = this.ring
			? new Float32Array(this.frameSize * slotCount)
			: null;
		this.ringMap.clear();
		this.frames = new Array(slotCount).fill(null);
		this.order = 0;
		this.count = 0;
	}

	store(frame: CachedFrame) {
		if (this.ring && this.ringStorage) {
			const bufferIndex = this.order % this.slotCount;
			this.order += 1;
			const start = bufferIndex * this.frameSize;
			this.ringStorage.set(frame.coords, start);
			const coords = this.ringStorage.subarray(start, start + this.frameSize);
			this.ringMap.set(frame.slotIndex, bufferIndex);
			if (!this.frames[frame.slotIndex]) this.count++;
			this.frames[frame.slotIndex] = { ...frame, coords };
			return;
		}
		if (!this.frames[frame.slotIndex]) this.count++;
		this.frames[frame.slotIndex] = frame;
	}

	get(slotIndex: number): CachedFrame | null {
		return this.frames[slotIndex] ?? null;
	}

	get loadedCount() {
		return this.count;
	}

	get usesRingBuffer() {
		return this.ring;
	}
}
