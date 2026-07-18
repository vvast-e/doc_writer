import { MainPage } from "@/pages/MainPage";

// Не используется в роутинге App.tsx (см. историю — оставлено на всякий
// случай как алиас). Держим компилируемым, переиспользуя MainPage вместо
// дублирования разметки формы набора.
export function Home() {
  return <MainPage />;
}

export default Home;

