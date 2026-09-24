import { OrderDetail } from "@/components/admin/order-detail";

export default async function AdminOrderPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <OrderDetail id={id} />;
}
