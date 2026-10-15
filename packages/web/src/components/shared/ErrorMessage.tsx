import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

interface ErrorMessageProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export function ErrorMessage({ title = "Something went wrong", message, action }: ErrorMessageProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </AlertDescription>
    </Alert>
  );
}
