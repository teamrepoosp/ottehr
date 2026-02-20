import LoadingButton from '@mui/lab/LoadingButton';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { FC, useEffect, useState } from 'react';

type Props = {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onSubmit: (newName: string) => Promise<void>;
};

export const RenameDocumentModal: FC<Props> = ({ open, initialName, onClose, onSubmit }) => {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);

  const buttonSx = {
    fontWeight: 500,
    textTransform: 'none',
    borderRadius: 6,
  };

  useEffect(() => {
    setName(initialName);
  }, [initialName, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onSubmit(name.trim());
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableScrollLock
      sx={{
        '.MuiPaper-root': {
          padding: 1,
          width: '444px',
          maxWidth: 'initial',
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle variant="h4" color="primary.dark" sx={{ width: '100%', m }}>
          Rename Document
        </DialogTitle>

        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Document name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            sx={{ mt: 1 }}
          />
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button variant="text" onClick={onClose} size="medium" sx={buttonSx}>
            Cancel
          </Button>
          <LoadingButton
            loading={loading}
            disabled={!name.trim()}
            type="submit"
            variant="contained"
            color="primary"
            size="medium"
            sx={buttonSx}
          >
            Save
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};
