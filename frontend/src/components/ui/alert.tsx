import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success:
          'border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-700 dark:[&>svg]:text-green-400',
        info: 'border-blue-500/50 text-blue-700 dark:text-blue-400 [&>svg]:text-blue-700 dark:[&>svg]:text-blue-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, children, ...props }, ref) => {
    const Icon =
      variant === 'destructive'
        ? AlertCircle
        : variant === 'success'
        ? CheckCircle
        : Info;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className="h-4 w-4" />
        <div>{children}</div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

const AlertTitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));

AlertTitle.displayName = 'AlertTitle';

const AlertDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));

AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
