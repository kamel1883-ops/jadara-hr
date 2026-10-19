import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "next-themes"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { lazy, Suspense } from "react";
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import VaultLive from '@/components/VaultLive';
import { LanguageProvider } from '@/lib/i18n';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from "@/components/Layout";
import AnimatedOutlet from "@/components/AnimatedOutlet";
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Employees = lazy(() => import("@/pages/Employees"));
const Attendance = lazy(() => import("@/pages/Attendance"));
const Approvals = lazy(() => import("@/pages/Approvals"));
const Leaves = lazy(() => import("@/pages/Leaves"));
const BusinessTrips = lazy(() => import("@/pages/BusinessTrips"));
const MyRequests = lazy(() => import("@/pages/MyRequests"));
const OwnerPortal = lazy(() => import("@/pages/OwnerPortal"));
const ExitInterviews = lazy(() => import("@/pages/ExitInterviews"));
const Surveys = lazy(() => import("@/pages/Surveys"));
const Investigations = lazy(() => import("@/pages/Investigations"));
const Warnings = lazy(() => import("@/pages/Warnings"));
const Decisions = lazy(() => import("@/pages/Decisions"));
const Incentives = lazy(() => import("@/pages/Incentives"));
const AdDesigns = lazy(() => import("@/pages/AdDesigns"));
const AppStoreScreens = lazy(() => import("@/pages/AppStoreScreens"));
const StrategicPlan = lazy(() => import("@/pages/StrategicPlan"));
const Payroll = lazy(() => import("@/pages/Payroll"));
const Gosi = lazy(() => import("@/pages/Gosi"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const Fleet = lazy(() => import("@/pages/Fleet"));
const Equipment = lazy(() => import("@/pages/Equipment"));
const Complaints = lazy(() => import("@/pages/Complaints"));
const FlightBookings = lazy(() => import("@/pages/FlightBookings"));
const HealthInsurance = lazy(() => import("@/pages/HealthInsurance"));
const VehicleInsurance = lazy(() => import("@/pages/VehicleInsurance"));
const EndOfService = lazy(() => import("@/pages/EndOfService"));
const Performance = lazy(() => import("@/pages/Performance"));
const Succession = lazy(() => import("@/pages/Succession"));
const OrgStructure = lazy(() => import("@/pages/OrgStructure"));
const WorkforcePlanning = lazy(() => import("@/pages/WorkforcePlanning"));
const Recruitment = lazy(() => import("@/pages/Recruitment"));
const Training = lazy(() => import("@/pages/Training"));
const JobApply = lazy(() => import("@/pages/public/JobApply"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Licenses = lazy(() => import("@/pages/Licenses"));
const PlatformSubscriptions = lazy(() => import("@/pages/PlatformSubscriptions"));
const HrBudget = lazy(() => import("@/pages/HrBudget"));
const Nitaqat = lazy(() => import("@/pages/Nitaqat"));
const Landing = lazy(() => import("@/pages/Landing"));
const Discounts = lazy(() => import("@/pages/Discounts"));
const ImportAttendance = lazy(() => import("@/pages/ImportAttendance"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Quote = lazy(() => import("@/pages/Quote"));
const CompanyLogin = lazy(() => import("@/pages/CompanyLogin"));
const CompanyForgotPassword = lazy(() => import("@/pages/CompanyForgotPassword"));
const CompanyRegister = lazy(() => import("@/pages/CompanyRegister"));
const QiwaMudadPage = lazy(() => import("@/pages/landings/QiwaMudadPage"));
const WpsMudadPage = lazy(() => import("@/pages/landings/WpsMudadPage"));
const EosCalculatorPage = lazy(() => import("@/pages/landings/EosCalculatorPage"));
const ContractsPage = lazy(() => import("@/pages/landings/ContractsPage"));
const AffiliateProgram = lazy(() => import("@/pages/AffiliateProgram"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const RefundPolicy = lazy(() => import("@/pages/RefundPolicy"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogArticle = lazy(() => import("@/pages/BlogArticle"));
const CustomerSurveys = lazy(() => import("@/pages/CustomerSurveys"));
const CustomerSurveyTake = lazy(() => import("@/pages/public/CustomerSurveyTake"));
const ContractSample = lazy(() => import("@/pages/ContractSample"));
const Samples = lazy(() => import("@/pages/Samples"));
const Brochure = lazy(() => import("@/pages/Brochure"));
const BrochureEn = lazy(() => import("@/pages/BrochureEn"));
import BrochureErrorBoundary from "@/components/BrochureErrorBoundary";
const HrSystemPage = lazy(() => import("@/pages/landings/HrSystemPage"));
const PayrollSystemPage = lazy(() => import("@/pages/landings/PayrollSystemPage"));
const AttendanceSystemPage = lazy(() => import("@/pages/landings/AttendanceSystemPage"));
const PerformanceSystemPage = lazy(() => import("@/pages/landings/PerformanceSystemPage"));
import { PortalLangProvider } from "@/lib/portalI18n";
import SplashScreen from "@/components/SplashScreen";

const PUBLIC_PATHS = ["/", "/about", "/contact", "/quote", "/login", "/register", "/forgot-password", "/reset-password", "/company-login", "/company-forgot-password", "/company-register", "/portal", "/owner-portal", "/qiwa-mudad", "/wps-mudad", "/eos-calculator", "/contracts", "/contract-sample", "/samples", "/brochure", "/brochure-en", "/strategic-plan", "/ad-designs", "/app-store-screens", "/hr-system", "/payroll-system", "/attendance-system", "/performance-system", "/privacy", "/refund-policy", "/affiliate-program"];

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const path = window.location.pathname;
  const isRestricted = user && user.role !== "admin";
  const isPublicPage = PUBLIC_PATHS.includes(path) || path.startsWith("/blog") || path.startsWith("/jobs") || path.startsWith("/c") || path.startsWith("/portal");

  if (!isPublicPage && (isLoadingPublicSettings || isLoadingAuth)) {
    return <SplashScreen />;
  }

  if (authError && !isPublicPage) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  if (isRestricted && !isPublicPage) return <Navigate to="/portal" replace />;

  if (isPublicPage) {
    return (
      <Routes>
        <Route element={<AnimatedOutlet />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/quote" element={<Quote />} />
          <Route path="/contract-sample" element={<ContractSample />} />
          <Route path="/samples" element={<Samples />} />
          <Route path="/brochure" element={<BrochureErrorBoundary><Brochure /></BrochureErrorBoundary>} />
          <Route path="/brochure-en" element={<BrochureErrorBoundary><BrochureEn /></BrochureErrorBoundary>} />
          {/* مستندات خاصة بالمالك فقط — بروابط مباشرة غير مرتبطة بأي بوابة أو قائمة تنقّل */}
          <Route path="/strategic-plan" element={<StrategicPlan />} />
          <Route path="/ad-designs" element={<AdDesigns />} />
          <Route path="/app-store-screens" element={<AppStoreScreens />} />
          <Route path="/hr-system" element={<HrSystemPage />} />
          <Route path="/payroll-system" element={<PayrollSystemPage />} />
          <Route path="/attendance-system" element={<AttendanceSystemPage />} />
          <Route path="/performance-system" element={<PerformanceSystemPage />} />
          <Route path="/company-login" element={<CompanyLogin />} />
          <Route path="/company-forgot-password" element={<CompanyForgotPassword />} />
          <Route path="/company-register" element={<CompanyRegister />} />
          <Route path="/qiwa-mudad" element={<QiwaMudadPage />} />
          <Route path="/wps-mudad" element={<WpsMudadPage />} />
          <Route path="/eos-calculator" element={<EosCalculatorPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/affiliate-program" element={<AffiliateProgram />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogArticle />} />
          <Route path="/jobs/:id" element={<JobApply />} />
          <Route path="/c/:surveyId" element={<CustomerSurveyTake />} />
          <Route path="/portal" element={<PortalLangProvider><MyRequests /></PortalLangProvider>} />
          <Route path="/portal/notifications" element={<PortalLangProvider><MyRequests /></PortalLangProvider>} />
          <Route path="/portal/approvals" element={<PortalLangProvider><MyRequests /></PortalLangProvider>} />
          <Route path="/owner-portal" element={<OwnerPortal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  // Render the main app (authenticated)
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/app" element={<Dashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/recruitment" element={<Recruitment />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/import-attendance" element={<ImportAttendance />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/leaves" element={<Leaves />} />
        <Route path="/business-trips" element={<BusinessTrips />} />
        <Route path="/flight-bookings" element={<FlightBookings />} />
        <Route path="/health-insurance" element={<HealthInsurance />} />
        <Route path="/vehicle-insurance" element={<VehicleInsurance />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/gosi" element={<Gosi />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/end-of-service" element={<EndOfService />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/training" element={<Training />} />
        <Route path="/succession" element={<Succession />} />
        <Route path="/org-structure" element={<OrgStructure />} />
        <Route path="/workforce-planning" element={<WorkforcePlanning />} />
        <Route path="/exit-interviews" element={<ExitInterviews />} />
        <Route path="/surveys" element={<Surveys />} />
        <Route path="/investigations" element={<Investigations />} />
        <Route path="/warnings" element={<Warnings />} />
        <Route path="/decisions" element={<Decisions />} />
        <Route path="/incentives" element={<Incentives />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/licenses" element={<Licenses />} />
        <Route path="/platform-subscriptions" element={<PlatformSubscriptions />} />
        <Route path="/hr-budget" element={<HrBudget />} />
        <Route path="/nitaqat" element={<Nitaqat />} />
        <Route path="/customer-surveys" element={<CustomerSurveys />} />
        <Route path="/discounts" element={<Discounts />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <AuthProvider>
      <LanguageProvider>
      <QueryClientProvider client={queryClientInstance}>
        <VaultLive>
        <Router>
          <ScrollToTop />
          <Suspense fallback={<SplashScreen />}>
            <AuthenticatedApp />
          </Suspense>
        </Router>
        </VaultLive>
        <Toaster />
      </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App