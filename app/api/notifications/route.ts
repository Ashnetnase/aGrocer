import { NextResponse } from 'next/server';
import { predictReorders } from '@/domain/services/reorderPrediction';
import { serverRepositories } from '@/server/repositories';
import { failed } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const repos = await serverRepositories();
    const [events, pantry] = await Promise.all([repos.inventoryEvents.list(), repos.pantry.list()]);
    const notifications = [
      ...predictReorders(events).map((item) => ({ kind: 'reorder', title: `${item.itemName} may need restocking`, detail: item.reason === 'recently-empty' ? 'It recently ran out.' : `Used ${item.uses} times recently.` })),
      ...pantry.filter((item) => item.state === 'soon').map((item) => ({ kind: 'use-soon', title: `Use ${item.name} soon`, detail: `${item.quantity} ${item.unit} remaining.` })),
    ];
    return NextResponse.json({ notifications: notifications.slice(0, 20) });
  } catch (error) {
    return failed(error);
  }
}
