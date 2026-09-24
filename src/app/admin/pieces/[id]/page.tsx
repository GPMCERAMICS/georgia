import { PieceForm } from "@/components/admin/piece-form";

export default async function EditPiecePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <PieceForm id={id} />;
}
