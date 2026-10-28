import { Route, Routes } from 'react-router';

import { AuthOnly, RequireAuth } from './routes/guards';
import { HomeLayout } from './components/HomeLayout';
import { BookmarksPage } from './pages/BookmarksPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { LegalPage } from './pages/LegalPage';
import { MistakesPage } from './pages/MistakesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PracticePage } from './pages/PracticePage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProfileSecurityPage } from './pages/ProfileSecurityPage';
import { ProgressPage } from './pages/ProgressPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ResultPage } from './pages/ResultPage';
import { SessionPage } from './pages/SessionPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { EnglishPage } from './pages/EnglishPage';
import { MathPage } from './pages/MathPage';

export default function App() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<HomeLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/english" element={<EnglishPage />} />
          <Route path="/math" element={<MathPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="/result/:sessionId" element={<ResultPage />} />
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/mistakes" element={<MistakesPage />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        <Route path="/profile/security" element={<ProfileSecurityPage />} />
        <Route path="/legal" element={<LegalPage />} />
      </Route>

      <Route element={<AuthOnly />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Recovery links land here with a freshly established session. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
