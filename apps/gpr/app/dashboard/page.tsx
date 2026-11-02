import { redirect } from 'next/navigation';

// Old placeholder; customers land on their claims after sign-in.
export default function DashboardPage() {
  redirect('/claims');
}
