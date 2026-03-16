const MAGIC = 0x50484731;
const HEADER_BYTES = 16;

export enum MdStreamPacketKind {
	Status = 1,
	Logs = 2,
	Init = 3,
	Frame = 4,
	End = 5,
	Error = 6,
}

export interface PacketEnvelope<THeader = Record<string, unknown>> {
	kind: MdStreamPacketKind;
	header: THeader;
	payload: Uint8Array;
}

export interface StreamInitHeader {
	atomCount: number;
	slotCount: number;
	residueCount: number;
	ringBufferSuggested?: boolean;
	topologyFormat: "pdb";
}

export interface StreamFrameHeader {
	slotIndex: number;
	sourceFrame: number;
	timeNs: number;
	progress: number;
	compressed?: boolean;
	scalars: Record<string, number>;
	sections: {
		coords: [number, number];
		rmsf: [number, number];
		dssp: [number, number];
	};
}

const textDecoder = new TextDecoder();

async function inflatePayload(payload: Uint8Array): Promise<Uint8Array> {
	if (typeof DecompressionStream === "undefined") {
		return payload;
	}
	const stream = new Blob([payload])
		.stream()
		.pipeThrough(new DecompressionStream("deflate"));
	const buffer = await new Response(stream).arrayBuffer();
	return new Uint8Array(buffer);
}

export async function decodeMdPacket(
	buffer: ArrayBuffer,
): Promise<PacketEnvelope> {
	const view = new DataView(buffer);
	const magic = view.getUint32(0, true);
	if (magic !== MAGIC) {
		throw new Error("Invalid MD stream packet");
	}
	const kind = view.getUint16(6, true) as MdStreamPacketKind;
	const headerLength = view.getUint32(8, true);
	const payloadLength = view.getUint32(12, true);
	const headerBytes = new Uint8Array(buffer, HEADER_BYTES, headerLength);
	const rawPayload = new Uint8Array(
		buffer,
		HEADER_BYTES + headerLength,
		payloadLength,
	);
	const header = JSON.parse(textDecoder.decode(headerBytes)) as Record<
		string,
		unknown
	>;
	const payload = header.compressed
		? await inflatePayload(rawPayload)
		: rawPayload;
	return { kind, header, payload };
}

export function framePayloadToFloat32(payload: Uint8Array): Float32Array {
	return new Float32Array(
		payload.buffer.slice(
			payload.byteOffset,
			payload.byteOffset + payload.byteLength,
		),
	);
}
