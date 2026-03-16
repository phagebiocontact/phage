import { describe, expect, it } from "vitest";
import { decodeMdPacket, MdStreamPacketKind } from "@/lib/md-stream";
import { TrajectoryCache } from "@/lib/trajectory-cache";

function encodePacket(
	kind: MdStreamPacketKind,
	header: Record<string, unknown>,
	payload: Uint8Array,
) {
	const headerBytes = new TextEncoder().encode(JSON.stringify(header));
	const buffer = new ArrayBuffer(16 + headerBytes.length + payload.length);
	const view = new DataView(buffer);
	view.setUint32(0, 0x50484731, true);
	view.setUint16(4, 1, true);
	view.setUint16(6, kind, true);
	view.setUint32(8, headerBytes.length, true);
	view.setUint32(12, payload.length, true);
	new Uint8Array(buffer, 16, headerBytes.length).set(headerBytes);
	new Uint8Array(buffer, 16 + headerBytes.length, payload.length).set(payload);
	return buffer;
}

describe("md-stream", () => {
	it("decodes binary packets", async () => {
		const payload = new Uint8Array([1, 2, 3, 4]);
		const packet = await decodeMdPacket(
			encodePacket(MdStreamPacketKind.Frame, { slotIndex: 2 }, payload),
		);
		expect(packet.kind).toBe(MdStreamPacketKind.Frame);
		expect(packet.header).toEqual({ slotIndex: 2 });
		expect(Array.from(packet.payload)).toEqual([1, 2, 3, 4]);
	});

	it("stores frames in ring-buffer mode", () => {
		const cache = new TrajectoryCache();
		cache.initialize(60000, 100);
		expect(cache.usesRingBuffer).toBe(true);
		cache.store({
			slotIndex: 0,
			sourceFrame: 0,
			timeNs: 0,
			progress: 0,
			coords: new Float32Array(60000 * 3).fill(1),
			rmsf: new Float32Array([1, 2]),
			dssp: new Float32Array([0, 1]),
			scalars: {},
		});
		expect(cache.get(0)?.coords[0]).toBe(1);
	});
});
