import { redirect } from 'next/navigation';

const AppIndexPage = () => {
  redirect('/app/dashboard');
};

export default AppIndexPage;
