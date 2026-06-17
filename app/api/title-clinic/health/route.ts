import { NextResponse } from "next/server";
import { titleClinicHealth } from "@/lib/title-clinic-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(titleClinicHealth(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
