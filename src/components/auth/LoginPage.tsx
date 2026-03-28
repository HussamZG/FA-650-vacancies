"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Ambulance, Mail, Lock, Eye, EyeOff, AlertCircle, 
  ChevronLeft, Crown, Award, Star
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || "حدث خطأ أثناء تسجيل الدخول");
    }

    setIsLoading(false);
  };

  const quickLogin = async (role: "admin" | "leader" | "scout" | "medic") => {
    const credentials = {
      admin: { email: "admin@ambulance650.com", password: "admin123" },
      leader: { email: "leader@ambulance650.com", password: "leader123" },
      scout: { email: "scout@ambulance650.com", password: "scout123" },
      medic: { email: "medic@ambulance650.com", password: "medic123" },
    };

    setEmail(credentials[role].email);
    setPassword(credentials[role].password);
    
    setIsLoading(true);
    const result = await login(credentials[role].email, credentials[role].password);
    if (!result.success) {
      setError(result.error || "حدث خطأ أثناء تسجيل الدخول");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 mb-4 shadow-lg shadow-red-500/30"
          >
            <Ambulance className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">مركز إسعاف 650</h1>
          <p className="text-zinc-400">نظام إدارة المناوبات</p>
        </div>

        {/* Login Card */}
        <Card className="bg-zinc-800/50 border-zinc-700/50 backdrop-blur-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-white">تسجيل الدخول</CardTitle>
            <CardDescription className="text-zinc-400">
              أدخل بياناتك للوصول إلى النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@ambulance650.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-500 pr-10 focus:border-red-500 focus:ring-red-500/20"
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-500 pr-10 pl-10 focus:border-red-500 focus:ring-red-500/20"
                    required
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-2.5 transition-all disabled:opacity-50"
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

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-800 px-2 text-zinc-500">أو تسجيل سريع</span>
              </div>
            </div>

            {/* Quick Login Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => quickLogin("admin")}
                disabled={isLoading}
                className="bg-zinc-700/50 border-zinc-600 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-2 justify-center"
              >
                <Crown className="h-4 w-4 text-red-400" />
                <span>قائد قطاع</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => quickLogin("leader")}
                disabled={isLoading}
                className="bg-zinc-700/50 border-zinc-600 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-2 justify-center"
              >
                <Award className="h-4 w-4 text-yellow-400" />
                <span>قائد فريق</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => quickLogin("scout")}
                disabled={isLoading}
                className="bg-zinc-700/50 border-zinc-600 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-2 justify-center"
              >
                <Star className="h-4 w-4 text-emerald-400" />
                <span>كشاف</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => quickLogin("medic")}
                disabled={isLoading}
                className="bg-zinc-700/50 border-zinc-600 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-2 justify-center"
              >
                <Ambulance className="h-4 w-4 text-cyan-400" />
                <span>مسعف</span>
              </Button>
            </div>

            {/* Demo Info */}
            <div className="mt-6 p-3 rounded-lg bg-zinc-700/30 border border-zinc-600/50">
              <p className="text-xs text-zinc-400 text-center">
                👆 اضغط على أحد الأزرار أعلاه لتسجيل الدخول السريع كـ مستخدم تجريبي
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-zinc-500 text-sm mt-6">
          © 2024 مركز إسعاف 650 - جميع الحقوق محفوظة
        </p>
      </motion.div>
    </div>
  );
}
