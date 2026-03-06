import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  let body: {
    name?: string;
    email?: string;
    postcode?: string;
    property_age?: string;
    interest_type?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = {
    name: body.name?.trim() ?? "",
    email: body.email?.trim() ?? "",
    postcode: body.postcode?.trim() ?? null,
    property_age: body.property_age || null,
    interest_type: body.interest_type || null,
  };

  if (!payload.name || !payload.email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error } = await supabase.from("leads").insert(payload);

  if (error) {
    console.error("Lead insert failed:", error);
    return NextResponse.json(
      { error: "Failed to save request" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
