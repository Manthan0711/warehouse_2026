import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Eye, EyeOff, Loader2, Mail, Lock, User, Phone, MapPin, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  userType: 'owner' | 'seeker';
  company?: string;
  location?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, loading } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    userType: 'seeker',
    company: '',
    location: '',
  });

  const validateLoginForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!loginData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!loginData.password) {
      newErrors.password = 'Password is required';
    } else if (loginData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegisterForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!registerData.name) newErrors.name = 'Name is required';
    
    if (!registerData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!registerData.password) {
      newErrors.password = 'Password is required';
    } else if (registerData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!registerData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-()]{10,}$/.test(registerData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (registerData.userType === 'owner' && !registerData.company) {
      newErrors.company = 'Company name is required for owners';
    }

    if (!registerData.location) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) return;

    try {
      const { error } = await signIn(loginData.email, loginData.password);
      
      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in",
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      toast({
        title: "Login failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegisterForm()) return;

    try {
      const { error } = await signUp(registerData.email, registerData.password, {
        name: registerData.name,
        phone: registerData.phone,
        user_type: registerData.userType,
        company: registerData.company || '',
      });

      if (error) {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Account created successfully!",
        description: "Please check your email to verify your account",
      });

      setActiveTab('login');
      setLoginData({ email: registerData.email, password: '' });
    } catch (err) {
      console.error('Registration error:', err);
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDemoLogin = async (email: string, password: string) => {
    setLoginData({ email, password });
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: "Demo login failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Demo login successful!",
        description: "Welcome to SmartSpace",
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Demo login error:', err);
      toast({
        title: "Demo login failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-auth relative flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-decoration"></div>
      <div className="w-full max-w-lg z-10 fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-3 mb-4">
            <Building2 className="h-12 w-12 text-blue-600 pulse" />
            <span className="text-3xl font-bold text-gradient-blue">SmartSpace</span>
          </Link>
          <p className="text-gray-600 text-lg">
            Connect with warehouse spaces across India
          </p>
        </div>

        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-2xl font-bold text-gray-900">
              {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {activeTab === 'login'
                ? 'Sign in to your account to continue'
                : 'Join SmartSpace to connect with warehouse spaces'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="font-medium">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className={`pl-10 h-11 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                    </div>
                    {errors.email && (
                      <Alert variant="destructive" className="py-2">
                        <AlertDescription className="text-sm">{errors.email}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className={`pl-10 pr-10 h-11 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <Alert variant="destructive" className="py-2">
                        <AlertDescription className="text-sm">{errors.password}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="remember" className="rounded border-gray-300" />
                      <Label htmlFor="remember" className="text-sm text-gray-600">Remember me</Label>
                    </div>
                    <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name" className="text-sm font-medium text-gray-700">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={registerData.name}
                          onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                          className={`pl-10 h-11 ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                      </div>
                      {errors.name && (
                        <Alert variant="destructive" className="py-2">
                          <AlertDescription className="text-sm">{errors.name}</AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-sm font-medium text-gray-700">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="Enter your email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          className={`pl-10 h-11 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                      </div>
                      {errors.email && (
                        <Alert variant="destructive" className="py-2">
                          <AlertDescription className="text-sm">{errors.email}</AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-phone" className="text-sm font-medium text-gray-700">
                        Phone Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="register-phone"
                          type="tel"
                          placeholder="Enter your phone number"
                          value={registerData.phone}
                          onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                          className={`pl-10 h-11 ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                      </div>
                      {errors.phone && (
                        <Alert variant="destructive" className="py-2">
                          <AlertDescription className="text-sm">{errors.phone}</AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Account Type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            registerData.userType === 'seeker'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setRegisterData({ ...registerData, userType: 'seeker' })}
                        >
                          <div className="text-center">
                            <User className="h-6 w-6 mx-auto mb-2" />
                            <div className="font-medium">Space Seeker</div>
                            <div className="text-xs text-gray-500">Looking for warehouse space</div>
                          </div>
                        </div>
                        <div
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            registerData.userType === 'owner'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setRegisterData({ ...registerData, userType: 'owner' })}
                        >
                          <div className="text-center">
                            <Building2 className="h-6 w-6 mx-auto mb-2" />
                            <div className="font-medium">Space Owner</div>
                            <div className="text-xs text-gray-500">Offering warehouse space</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {registerData.userType === 'owner' && (
                      <div className="space-y-2">
                        <Label htmlFor="register-company" className="text-sm font-medium text-gray-700">
                          Company Name
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="register-company"
                            type="text"
                            placeholder="Enter your company name"
                            value={registerData.company || ''}
                            onChange={(e) => setRegisterData({ ...registerData, company: e.target.value })}
                            className={`pl-10 h-11 ${errors.company ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                        </div>
                        {errors.company && (
                          <Alert variant="destructive" className="py-2">
                            <AlertDescription className="text-sm">{errors.company}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="register-location" className="text-sm font-medium text-gray-700">
                        Location
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="register-location"
                          type="text"
                          placeholder="Enter your city/state"
                          value={registerData.location || ''}
                          onChange={(e) => setRegisterData({ ...registerData, location: e.target.value })}
                          className={`pl-10 h-11 ${errors.location ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                      </div>
                      {errors.location && (
                        <Alert variant="destructive" className="py-2">
                          <AlertDescription className="text-sm">{errors.location}</AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-sm font-medium text-gray-700">
                          Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="register-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create password"
                            value={registerData.password}
                            onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                            className={`pl-10 pr-10 h-11 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password && (
                          <Alert variant="destructive" className="py-2">
                            <AlertDescription className="text-sm">{errors.password}</AlertDescription>
                          </Alert>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-confirm-password" className="text-sm font-medium text-gray-700">
                          Confirm Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="register-confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm password"
                            value={registerData.confirmPassword}
                            onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                            className={`pl-10 pr-10 h-11 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <Alert variant="destructive" className="py-2">
                            <AlertDescription className="text-sm">{errors.confirmPassword}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 pt-4">
                    <input type="checkbox" id="terms" className="mt-0.5 rounded border-gray-300" required />
                    <Label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                      I agree to the{' '}
                      <Link to="/terms" className="text-blue-600 hover:text-blue-700">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-blue-600 hover:text-blue-700">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {activeTab === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  onClick={() => setActiveTab(activeTab === 'login' ? 'register' : 'login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {activeTab === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-4">
                  Quick Demo Access
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-12 bg-blue-600 hover:bg-blue-700 border-blue-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => handleDemoLogin('demo.seeker@smartspace.com', 'demo123')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Seeker Demo
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 bg-green-600 hover:bg-green-700 border-green-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => handleDemoLogin('demo.owner@smartspace.com', 'demo123')}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Owner Demo
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 bg-purple-600 hover:bg-purple-700 border-purple-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => handleDemoLogin('demo.admin@smartspace.com', 'demo123')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Demo
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Secure • Trusted • Fast</p>
          <div className="flex justify-center items-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>SSL Encrypted</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
