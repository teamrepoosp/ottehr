import CloseIcon from '@mui/icons-material/Close';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import { LoadingButton } from '@mui/lab';
import { Box, Dialog, DialogContent, DialogTitle, Divider, Grid, IconButton, Typography } from '@mui/material';
import Oystehr from '@oystehr/sdk';
import { FC, useState } from 'react';
import { useOystehrAPIClient } from 'src/features/visits/shared/hooks/useOystehrAPIClient';
import { LabListsDTO, OrderableItemSearchResult } from 'utils';

type LabSetsProps = {
  labSets: LabListsDTO[];
  setSelectedLabs: React.Dispatch<React.SetStateAction<OrderableItemSearchResult[]>>;
};

export const LabSets: FC<LabSetsProps> = ({ labSets, setSelectedLabs }) => {
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string[] | undefined>(undefined);

  const apiClient = useOystehrAPIClient();

  const handleSelectLabSet = async (labSet: LabListsDTO): Promise<void> => {
    setLoadingId(labSet.listId); // start loading for this button only
    try {
      const res = await apiClient?.getCreateExternalLabResources({
        selectedLabSet: labSet,
      });
      const labs = res?.labs;

      if (labs) {
        setSelectedLabs((currentLabs) => {
          const existingCodes = new Set(currentLabs.map((lab) => `${lab.item.itemCode}${lab.lab.labGuid}`));

          const newLabs = labs.filter((lab) => !existingCodes.has(`${lab.item.itemCode}${lab.lab.labGuid}`));

          return [...currentLabs, ...newLabs];
        });
        setOpen(false);
      }
    } catch (e) {
      const sdkError = e as Oystehr.OystehrSdkError;
      console.log('error selecting this lab set', sdkError.code, sdkError.message);
      const errorMessage = [sdkError.message];
      setError(errorMessage);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <Box
        sx={{ display: 'flex', p: '16px 8px', cursor: 'pointer' }}
        gap={1}
        color="primary.main"
        onClick={() => setOpen(true)}
      >
        <FormatListBulletedIcon />
        <Typography fontWeight="500">Lab Sets</Typography>
      </Box>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: '24px 24px 16px 24px',
          }}
        >
          <Typography variant="h4" color="primary.dark">
            Lab Sets
          </Typography>
          <IconButton
            onClick={() => {
              setError(undefined);
              setOpen(false);
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {labSets.map((set, idx) => (
            <>
              <Grid key={`set-${idx}-${set.listId}`} container>
                <Grid
                  item
                  xs={9}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    rowGap: '8px',
                  }}
                >
                  <Typography variant="h6" fontWeight="700" color="primary.dark">
                    {set.listName}:
                  </Typography>
                  {set.labs.map((lab) => (
                    <Typography>{lab.display}</Typography>
                  ))}
                </Grid>
                <Grid item xs={3} sx={{ textAlign: 'right' }}>
                  <LoadingButton
                    loading={loadingId === set.listId}
                    variant="contained"
                    sx={{ borderRadius: '100px', p: '8px 22px', textTransform: 'none' }}
                    onClick={async () => {
                      await handleSelectLabSet(set);
                    }}
                  >
                    Select
                  </LoadingButton>
                </Grid>
              </Grid>
              {idx < labSets.length - 1 && <Divider sx={{ my: 2 }} />}
            </>
          ))}
          {Array.isArray(error) &&
            error.length > 0 &&
            error.map((msg, idx) => (
              <Grid item xs={12} sx={{ textAlign: 'right', paddingTop: 1 }} key={idx}>
                <Typography color="error">{typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)}</Typography>
              </Grid>
            ))}
        </DialogContent>
      </Dialog>
    </>
  );
};
