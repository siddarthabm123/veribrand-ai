import ReviewRoom from '@/app/impact/review/[id]/review-room';

export const instant = false;

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewRoom id={id} />;
}
