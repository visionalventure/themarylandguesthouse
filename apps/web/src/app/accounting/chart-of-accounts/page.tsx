import { redirect } from 'next/navigation';

export default function ChartOfAccountsRedirect() {
  redirect('/accounting?tab=accounts');
}
