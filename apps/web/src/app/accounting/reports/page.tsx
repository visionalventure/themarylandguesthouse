import { redirect } from 'next/navigation';

export default function ReportsRedirect() {
  redirect('/accounting?tab=overview');
}
