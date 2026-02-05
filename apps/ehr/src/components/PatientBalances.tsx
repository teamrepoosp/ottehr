import { otherColors } from '@ehrTheme/colors';
import { Box, CircularProgress, Paper, Typography } from '@mui/material';
import { DateTime } from 'luxon';
import { Fragment, ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { RoundedButton } from 'src/components/RoundedButton';
import { GetPatientBalancesZambdaOutput } from 'utils';

export interface PaymentBalancesProps {
  patientId: string | undefined;
  patientBalances: GetPatientBalancesZambdaOutput | undefined;
}

export default function PatientBalances({ patientId, patientBalances }: PaymentBalancesProps): ReactElement {
  const { encounters } = patientBalances || { encounters: [] };
  return (
    <Paper
      sx={{
        marginTop: 2,
        padding: 3,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" color="primary.dark">
          Outstanding Balance
        </Typography>
        <Typography variant="h4" color="error.dark">
          ${((patientBalances?.totalBalanceCents ?? 0) / 100).toFixed(2)}
        </Typography>
      </Box>
      {patientBalances ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 2,
            mt: 2,
            alignItems: 'center',
            backgroundColor: 'background.default',
            p: 2,
            borderRadius: 1,
          }}
        >
          {encounters.map((encounter, index) => (
            <Fragment key={encounter.encounterId}>
              <Box sx={{ display: 'contents' }}>
                <Box
                  component={Link}
                  to={`/visit/${encounter.appointmentId}`}
                  target="_blank"
                  sx={{ color: 'primary.main', textDecoration: 'none' }}
                >
                  {encounter.appointmentId}
                </Box>
                <Box sx={{ color: 'text.primary' }}>
                  {DateTime.fromISO(encounter.encounterDate).toFormat('MM/dd/yyyy')}
                </Box>
                <Box
                  sx={{
                    color: 'text.primary',
                    fontWeight: 'bold',
                    textAlign: 'right',
                  }}
                >{`$${(encounter.patientBalanceCents / 100).toFixed(2)}`}</Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <RoundedButton
                    // todo pop up "add payment" modal ui, but tag payment to visit
                    to={'/patient/' + patientId}
                  >
                    Pay for visit
                  </RoundedButton>
                </Box>
                {index !== encounters.length - 1 && (
                  <Box
                    sx={{
                      gridColumn: '1 / -1',
                      borderBottom: `1px solid ${otherColors.dottedLine}`,
                    }}
                  />
                )}
              </Box>
            </Fragment>
          ))}
        </Box>
      ) : (
        <CircularProgress />
      )}
      {/* {patient && (
        <PaymentDialog
          open={paymentDialogOpen}
          patient={patient}
          appointmentId={appointment?.id}
          handleClose={() => setPaymentDialogOpen(false)}
          isSubmitting={createNewPayment.isPending}
          submitPayment={async (data: CashOrCardPayment) => {
            const postInput: PostPatientPaymentInput = {
              patientId: patient.id ?? '',
              encounterId,
              paymentDetails: data,
            };
            await createNewPayment.mutateAsync(postInput);
          }}
        />
      )} */}
      {/* <Snackbar
        open={errorMessage !== null}
        autoHideDuration={6000}
        onClose={() => createNewPayment.reset()}
      >
        <Alert severity="error" onClose={() => createNewPayment.reset()} sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar> */}
    </Paper>
  );
}
