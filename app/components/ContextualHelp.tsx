import React from 'react';
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components';

interface ContextualHelpProps {
  'aria-label'?: string;
  children: React.ReactNode;
}

export function ContextualHelp({ 'aria-label': ariaLabel, children }: ContextualHelpProps) {
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