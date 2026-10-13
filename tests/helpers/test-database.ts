import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
export async function createTestDatabase(users: string[]) {
  const db = new PGlite();
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    grant usage on schema auth to authenticated;
    create role tr_lab_migrator createrole;
    grant connect,create on database postgres to tr_lab_migrator with grant option;
    grant create,usage on schema public to tr_lab_migrator with grant option;
    grant usage on schema auth to tr_lab_migrator;grant references on auth.users to tr_lab_migrator;`);
  for (const user of users) await db.query('insert into auth.users values($1)', [user]);
  await db.exec('set role tr_lab_migrator');
  for (const path of (await readdir('supabase/migrations'))
    .filter((p) => p.endsWith('.sql'))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${path}`, 'utf8'));
  await db.exec('reset role');
  return db;
}
export async function queryAs<T>(db: PGlite, owner: string, sql: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [owner]);
    await tx.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: owner }),
    ]);
    return (await tx.query<{ result: T }>(sql, params)).rows[0]?.result;
  });
}
