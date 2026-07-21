import GymClient from "./GymClient";

export default async function GymPage({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  const { room } = await searchParams;
  return <GymClient initialRoom={room} />;
}
