import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import authCover from '@/assets/arab-board-cover.png';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({ title: 'Invalid Email', description: emailResult.error.errors[0].message, variant: 'destructive' });
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast({ title: 'Invalid Password', description: passwordResult.error.errors[0].message, variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({ title: 'Login Failed', description: 'Invalid email or password', variant: 'destructive' });
          } else {
            toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
          }
        } else {
          toast({ title: 'Welcome back!', description: 'Successfully logged in' });
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({ title: 'Account Exists', description: 'This email is already registered. Please sign in instead.', variant: 'destructive' });
          } else {
            toast({ title: 'Sign Up Failed', description: error.message, variant: 'destructive' });
          }
        } else {
          toast({ title: 'Account Created!', description: "Welcome to Arab Board Final Exam" });
        }
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/10">
        <CardHeader className="text-center space-y-4 pb-2">
          {/* Book Cover Image */}
          <div className="mx-auto relative">
            <div className="w-32 h-40 rounded-lg overflow-hidden shadow-lg border-2 border-primary/20 bg-card">
              <img 
                src={authCover} 
                alt="Arab Board Final Exam" 
                className="w-full h-full object-cover"
              />
            </div>
            {/* Subtle glow effect */}
            <div className="absolute inset-0 -z-10 bg-primary/20 blur-xl rounded-full scale-150 opacity-50" />
          </div>
          
          {/* Title */}
          <div className="space-y-1">
            <CardTitle className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-foreground">
              Arab Board
              <br />
              <span className="text-primary">Final Exam</span>
            </CardTitle>
            <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">
              ABC MCQs Compilation
            </p>
          </div>
          
          <CardDescription className="text-base">
            {isLogin ? 'Sign in to continue your studies' : 'Create an account to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
              disabled={isLoading}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
