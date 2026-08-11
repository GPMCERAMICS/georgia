import { PieceForm } from "@/components/admin/piece-form";

export default async function EditPiecePage(
  props: PageProps<"/admin/pieces/[id]">,
) {
  const { id } = await props.params;
  return <PieceForm id={id} />;
}
