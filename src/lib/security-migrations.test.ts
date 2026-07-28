import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readMigration(fileName: string) {
  return readFileSync(
    resolve(process.cwd(), "supabase", "migrations", fileName),
    "utf8",
  ).toLocaleLowerCase("en-US");
}

function readSource(fileName: string) {
  return readFileSync(resolve(process.cwd(), fileName), "utf8");
}

describe("security migrations", () => {
  const hardening = readMigration("0024_security_hardening.sql");
  const privacy = readMigration("0025_profile_privacy.sql");
  const profileWrites = readMigration("0026_profile_write_rpcs.sql");

  it("protects profile, item and trade request updates", () => {
    expect(hardening).toContain("profile_self_update_is_safe");
    expect(hardening).toContain("item_owner_update_is_safe");
    expect(hardening).toContain("trade_request_participant_update_is_safe");
    expect(hardening).toContain("old.status = 'traded'");
    expect(hardening).toContain("new.status <> 'traded'");
  });

  it("enforces abuse limits at the database boundary", () => {
    expect(hardening).toContain("pg_advisory_xact_lock");
    expect(hardening).toContain("trade_requests_enforce_rate_limit");
    expect(hardening).toContain("messages_enforce_rate_limit");
    expect(hardening).toContain("reports_enforce_rate_limit");
    expect(hardening).toContain(
      "revoke all on function public.consume_rate_limit(text, integer, integer, text) from authenticated",
    );
  });

  it("keeps private profile fields and media out of public access", () => {
    expect(privacy).toContain("revoke select on table public.profiles from anon");
    expect(privacy).toContain("create or replace function public.get_my_profile()");
    expect(privacy).toContain("set public = false");
    expect(privacy).toContain("left(postal_code, 3) || '00'");
    expect(privacy).not.toMatch(/grant select \([^)]*postal_code/s);
    expect(privacy).not.toMatch(/grant select \([^)]*phone_last4/s);
  });

  it("restores profile writes through narrow authenticated functions", () => {
    const profileDetailsFunction = profileWrites.split(
      "create or replace function public.sync_my_phone_verification",
    )[0];

    expect(profileDetailsFunction).toContain(
      "create or replace function public.update_my_profile",
    );
    expect(profileDetailsFunction).toContain("security definer");
    expect(profileDetailsFunction).toContain("v_user_id uuid := auth.uid()");
    expect(profileDetailsFunction).toContain(
      "'/api/media/profile-avatars/' || v_user_id::text",
    );
    expect(profileDetailsFunction).not.toContain("rating_avg");
    expect(profileDetailsFunction).not.toContain("is_admin =");
    expect(profileDetailsFunction).not.toContain("is_banned =");
    expect(profileWrites).toContain(
      "create or replace function public.sync_my_phone_verification()",
    );
    expect(profileWrites).toContain(
      "create or replace function public.sync_my_email_verification()",
    );
    expect(profileWrites).toContain(
      "grant execute on function public.update_my_profile(",
    );
    expect(profileWrites).toContain(") to authenticated;");
  });

  it("routes user profile mutations through the protected functions", () => {
    const actions = readSource("src/app/actions.ts");
    const data = readSource("src/lib/data.ts");

    expect(actions).toContain('.rpc("update_my_profile"');
    expect(actions.match(/\.rpc\("sync_my_phone_verification"\)/g)).toHaveLength(2);
    expect(data).toContain('.rpc("sync_my_email_verification")');
    expect(actions).not.toMatch(
      /\.from\("profiles"\)\s*\.update\(\{\s*display_name:/s,
    );
  });
});
