import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssessmentIcon from '@mui/icons-material/Assessment';
import {
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { Box, Stack } from '@mui/system';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Task } from 'fhir/r4b';
import { DateTime } from 'luxon';
import { enqueueSnackbar } from 'notistack';
import React, { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SendInvoiceToPatientDialog } from 'src/components/dialogs';
import {
  chooseJson,
  GET_INVOICES_TASKS_ZAMBDA_KEY,
  GetInvoicesTasksInput,
  GetInvoicesTasksResponse,
  INVOICEABLE_PATIENTS_PAGE_SIZE,
  InvoiceablePatientReport,
  InvoiceTaskInput,
} from 'utils';
import { updateInvoiceTask } from '../../api/api';
import { SelectInput } from '../../components/input/SelectInput';
import { useApiClients } from '../../hooks/useAppClients';
import PageContainer from '../../layout/PageContainer';

const INVOICE_TASK_STATUS_LABEL: Record<string, Task['status']> = {
  ready: 'ready',
  'in-progress': 'in-progress',
  completed: 'completed',
};

export default function InvoiceablePatients(): React.ReactElement {
  const { oystehrZambda } = useApiClients();
  const navigate = useNavigate();
  const methods = useForm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedReport, setSelectedReport] = useState<InvoiceablePatientReport | undefined>();
  const page = Number(searchParams.get('page') ?? '0');

  const handleBack = (): void => {
    navigate('/reports');
  };

  const setPage = (page: number): void => {
    searchParams.set('page', page.toString());
    setSearchParams(searchParams);
  };

  const sendInvoice = async (taskId: string, invoiceTaskInput: InvoiceTaskInput): Promise<void> => {
    try {
      if (oystehrZambda) {
        await updateInvoiceTask(oystehrZambda, {
          taskId,
          status: 'requested',
          invoiceTaskInput,
          userTimezone: DateTime.local().zoneName,
        });
        setSelectedReport(undefined);
        enqueueSnackbar('Invoice created and sent successfully', { variant: 'success' });
      }
    } catch {
      enqueueSnackbar('Error occurred during invoice creation, please try again', { variant: 'error' });
    }
  };

  // const updateInvoice = async (taskId: string, invoiceTaskInput: InvoiceTaskInput): Promise<void> => {
  //
  // }

  const useGetInvoiceablePatients = (): UseQueryResult<GetInvoicesTasksResponse, Error> => {
    return useQuery({
      queryKey: [GET_INVOICES_TASKS_ZAMBDA_KEY, page],
      queryFn: async () => {
        if (!oystehrZambda) throw new Error('oystehrZambda not defined');
        const status = searchParams.get('status');
        const params: GetInvoicesTasksInput = {
          page,
          status: status ? (status as Task['status']) : undefined,
        };
        const response = await oystehrZambda.zambda.execute({
          id: GET_INVOICES_TASKS_ZAMBDA_KEY,
          ...params,
        });
        return chooseJson(response);
      },
      enabled: oystehrZambda !== undefined,
      retry: 2,
      staleTime: 5 * 1000,
    });
  };

  const { data: invoiceablePatients, isLoading: isInvoiceablePatientsLoading } = useGetInvoiceablePatients();

  return (
    <PageContainer>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" color="primary.dark" fontWeight={600}>
              Invoiceable Patients Report
            </Typography>
          </Box>
        </Box>

        <FormProvider {...methods}>
          <Paper>
            <Stack direction="row" spacing={2} padding="8px">
              <SelectInput
                name="status"
                label="Status"
                options={Object.keys(INVOICE_TASK_STATUS_LABEL)}
                getOptionLabel={(option) => INVOICE_TASK_STATUS_LABEL[option]}
              />
            </Stack>
          </Paper>
        </FormProvider>
        <Paper>
          <Table sx={{ width: '100%' }}>
            <TableHead>
              <TableRow>
                <TableCell style={{ width: '200px' }}>
                  <Typography fontWeight="500" fontSize="14px">
                    Patient Name
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="500" fontSize="14px">
                    DOB
                  </Typography>
                </TableCell>
                <TableCell style={{ width: '200px' }}>
                  <Typography fontWeight="500" fontSize="14px">
                    Appointment Date
                  </Typography>
                </TableCell>
                <TableCell style={{ width: '200px' }}>
                  <Typography fontWeight="500" fontSize="14px">
                    Finalization Date
                  </Typography>
                </TableCell>
                <TableCell style={{ width: '200px' }}>
                  <Typography fontWeight="500" fontSize="14px">
                    Responsible Party
                  </Typography>
                </TableCell>
                <TableCell style={{ width: '200px' }}>
                  <Typography fontWeight="500" fontSize="14px">
                    Amount
                  </Typography>
                </TableCell>
                <TableCell style={{ width: '200px' }}>
                  <Typography fontWeight="500" fontSize="14px">
                    Claim id
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isInvoiceablePatientsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : null}
              {!isInvoiceablePatientsLoading && (invoiceablePatients?.reports ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2">No reports</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {!isInvoiceablePatientsLoading &&
                (invoiceablePatients?.reports ?? []).map((report) => {
                  return (
                    <TableRow>
                      <TableCell>
                        <Link
                          to={`/patient/${report.patient.patientId}`}
                          style={{ textDecoration: 'underline', color: 'inherit' }}
                        >
                          <Typography variant="inherit">{report.patient.fullName}</Typography>
                        </Link>{' '}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1">{report.patient.dob}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1">{report.visitDate}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1">{report.finalizationDate}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1">
                          {report.responsibleParty.fullName}, {report.responsibleParty.relationshipToPatient}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1">{report.amountInvoiceable}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1">{report.claimId}</Typography>
                      </TableCell>
                      <TableCell>
                        <Button>Refresh</Button>
                        <Button
                          onClick={() => {
                            setSelectedReport(report);
                          }}
                        >
                          Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[INVOICEABLE_PATIENTS_PAGE_SIZE]}
            component="div"
            count={invoiceablePatients?.totalCount ?? -1}
            rowsPerPage={INVOICEABLE_PATIENTS_PAGE_SIZE}
            page={page}
            onPageChange={(_e, newPageNumber) => {
              setPage(newPageNumber);
            }}
          />
        </Paper>
        <SendInvoiceToPatientDialog
          title="Send invoice"
          modalOpen={selectedReport !== undefined}
          handleClose={() => {
            setSelectedReport(undefined);
          }}
          submitButtonName="Send Invoice"
          onSubmit={sendInvoice}
          report={selectedReport}
        />
      </Box>
    </PageContainer>
  );
}
