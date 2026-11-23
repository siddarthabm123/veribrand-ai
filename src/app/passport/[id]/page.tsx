import PassportView from '@/components/PassportView';
export const instant = false;
export default async function PassportPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PassportView id={id}/>; }
