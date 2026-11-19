import { CustomOrderEditor } from "@/components/admin/custom-order-editor";

export default async function AdminCustomOrderPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <CustomOrderEditor id={id} />;
}
