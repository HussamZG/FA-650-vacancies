"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Ambulance, Mail, Lock, Eye, EyeOff, AlertCircle, 
  ChevronLeft, UserPlus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputClassName =
    "h-14 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 shadow-none focus-visible:border-[#ff7b86]/40 focus-visible:ring-[#ff5f6d]/20";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || "حدث خطأ أثناء تسجيل الدخول");
    }

    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("يرجى إدخال الاسم");
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق");
      return;
    }

    setIsLoading(true);

    const result = await register(name.trim(), email, password);

    if (!result.success) {
      setError(result.error || "حدث خطأ أثناء إنشاء الحساب");
    } else {
      setSuccess(result.message || "تم إنشاء الحساب بنجاح");
      setConfirmPassword("");
      if (result.shouldGoToLogin) {
        setMode("login");
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="app-stage relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_26%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:120px_120px]" />
      <div className="absolute inset-x-0 top-0 mx-auto h-[30rem] w-[30rem] rounded-full bg-[#ff5f6d]/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative mx-auto flex w-full max-w-xl flex-col items-center"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="mb-5 inline-flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,#ff6d78_0%,#ff506a_100%)] shadow-[0_20px_55px_rgba(255,95,109,0.35)]"
          >
            <Ambulance className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-glow mb-2 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            مركز إسعاف 650
          </h1>
          <p className="text-lg font-semibold text-[#ffb3bb] sm:text-xl">نظام إدارة المناوبات</p>
          <div className="accent-underline mx-auto mt-5" />
        </div>

        <Card className="glass-panel w-full max-w-[37rem] gap-0 overflow-hidden rounded-[2.2rem] border-white/10 bg-transparent py-0 shadow-none">
          <CardHeader className="px-8 pb-0 pt-8 text-center sm:px-12 sm:pt-10">
            <CardTitle className="text-3xl font-bold leading-tight text-white">
              {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
            </CardTitle>
            <CardDescription className="mt-3 text-base leading-8 text-slate-300">
              {mode === "login" ? "أدخل بياناتك للوصول إلى النظام" : "أنشئ حسابك للبدء باستخدام النظام"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 pt-6 sm:px-12 sm:pb-10">
            <Tabs
              value={mode}
              onValueChange={(value) => {
                setMode(value as "login" | "register");
                setError("");
                setSuccess("");
              }}
              className="space-y-5"
            >
              <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="register">إنشاء حساب</TabsTrigger>
              </TabsList>

              {(error || success) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2 rounded-2xl border p-4 text-sm ${
                    error
                      ? "border-red-400/30 bg-red-500/10 text-red-200"
                      : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  }`}
                >
                  {error ? <AlertCircle className="h-4 w-4 flex-shrink-0" /> : <UserPlus className="h-4 w-4 flex-shrink-0" />}
                  <span>{error || success}</span>
                </motion.div>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-semibold text-slate-100">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="example@ambulance650.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${inputClassName} pr-12`}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-semibold text-slate-100">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClassName} pr-12 pl-12`}
                        required
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-14 w-full rounded-2xl text-base font-bold"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>جاري تسجيل الدخول...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>تسجيل الدخول</span>
                        <ChevronLeft className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="text-sm font-semibold text-slate-100">الاسم الكامل</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="مثال: حسام شطاير"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClassName}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-semibold text-slate-100">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="example@ambulance650.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${inputClassName} pr-12`}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm font-semibold text-slate-100">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="6 أحرف على الأقل"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClassName} pr-12 pl-12`}
                        required
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password" className="text-sm font-semibold text-slate-100">تأكيد كلمة المرور</Label>
                    <Input
                      id="register-confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="أعد كتابة كلمة المرور"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClassName}
                      required
                      dir="ltr"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-14 w-full rounded-2xl text-base font-bold"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>جاري إنشاء الحساب...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>إنشاء الحساب</span>
                        <UserPlus className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-slate-400/80">
          © 2024 مركز إسعاف 650 - جميع الحقوق محفوظة
        </p>
      </motion.div>
    </div>
  );
}
