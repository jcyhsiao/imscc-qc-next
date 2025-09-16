import React from 'react';
import { Button, Dialog, DialogTrigger, Heading, Popover } from 'react-aria-components';

interface ContextualHelpProps {
  variant?: 'info' | 'help';
  'aria-label'?: string;
  children: React.ReactNode;
}

export function ContextualHelp({ variant = 'info', 'aria-label': ariaLabel, children }: ContextualHelpProps) {
  return (
    <DialogTrigger>
      <Button aria-label={ariaLabel || 'More information'}>
        ℹ️
      </Button>
      <Popover placement="bottom">
        <Dialog>
          {children}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}