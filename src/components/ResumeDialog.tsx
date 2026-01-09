import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useQuizSettings } from '@/hooks/useQuizSettings';

interface ResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onStartOver: () => void;
  lastQuestionNumber: number;
  totalQuestions: number;
  answeredCount: number;
}

export default function ResumeDialog({
  open,
  onOpenChange,
  onResume,
  onStartOver,
  lastQuestionNumber,
  totalQuestions,
  answeredCount,
}: ResumeDialogProps) {
  const { resumeByDefault, setResumeByDefault } = useQuizSettings();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resume Quiz?</AlertDialogTitle>
          <AlertDialogDescription>
            You have answered {answeredCount} of {totalQuestions} questions. 
            Would you like to resume from question {lastQuestionNumber} or start from the beginning?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="remember-choice"
            checked={resumeByDefault}
            onCheckedChange={(checked) => setResumeByDefault(checked as boolean)}
          />
          <Label htmlFor="remember-choice" className="text-sm text-muted-foreground cursor-pointer">
            Remember my choice (auto-resume by default)
          </Label>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStartOver}>Start from Beginning</AlertDialogCancel>
          <AlertDialogAction onClick={onResume}>
            Resume (Q{lastQuestionNumber})
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
