import { Box } from '@mui/system';
import React from 'react';
import PageContainer from '../../layout/PageContainer';

export default function InvoiceablePatients(): React.ReactElement {
  // const navigate = useNavigate();
  // const { oystehrZambda, oystehr } = useApiClients();
  // const [loading, setLoading] = useState<boolean>(false);
  // const [error, setError] = useState<string | null>(null);
  // const [reportData, setReportData] = useState<InvoiceablePatientsReport | null>(null);
  // const handleBack = (): void => {
  //   navigate('/reports');
  // };
  // const patientsReportsColumns: GridColDef[] = useMemo(
  //   () => [
  //     {
  //       field: 'patientName',
  //       headerName: 'Patient Name',
  //       width: 250,
  //       sortable: true,
  //       renderCell: (params: GridRenderCellParams) => (
  //         <Link to={`/patient/${params.row.patientId}`} style={{ textDecoration: 'underline', color: 'inherit' }}>
  //           <Typography variant="inherit">{params.value}</Typography>
  //         </Link>
  //       ),
  //     },
  //     {
  //       field: 'patientDob',
  //       headerName: 'DOB',
  //       width: 180,
  //       sortable: true,
  //     },
  //     {
  //       field: 'appointmentDate',
  //       headerName: 'Appointment Date',
  //       width: 180,
  //       sortable: true,
  //     },
  //     {
  //       field: 'finalizationDate',
  //       headerName: 'Finalization Date',
  //       width: 180,
  //       sortable: true,
  //     },
  //     {
  //       field: 'responsiblePartyName',
  //       headerName: 'Responsible Party',
  //       width: 250,
  //       sortable: true,
  //       renderCell: (params: GridRenderCellParams) => (
  //         <Typography variant="inherit">
  //           {params.value}, {params.row.responsiblePartyRelationship}
  //         </Typography>
  //       ),
  //     },
  //     {
  //       field: 'amountInvoiceable',
  //       headerName: 'Amount',
  //       width: 100,
  //       sortable: true,
  //     },
  //     {
  //       field: 'candidClaimId',
  //       headerName: 'Candid ID',
  //       width: 350,
  //       sortable: true,
  //     },
  //   ],
  //   []
  // );

  // const patientsRows = useMemo(() => {
  //   if (!reportData?.patientsReports) return [];
  //
  //   return reportData.patientsReports.map((patient) => ({
  //     id: patient.claimId,
  //     patientId: patient.id,
  //     patientName: patient.name,
  //     patientDob: patient.dob,
  //     finalizationDate: patient.finalizationDate,
  //     appointmentDate: patient.appointmentDate,
  //     responsiblePartyName: patient.responsiblePartyName,
  //     responsiblePartyRelationship: patient.responsiblePartyRelationshipToPatient,
  //     amountInvoiceable: patient.amountInvoiceable,
  //     candidClaimId: patient.claimId,
  //   }));
  // }, [reportData]);

  return (
    <PageContainer>
      <Box>
        {/*  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>*/}
        {/*    <IconButton onClick={handleBack} sx={{ mr: 2 }}>*/}
        {/*      <ArrowBackIcon />*/}
        {/*    </IconButton>*/}
        {/*    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>*/}
        {/*      <AssessmentIcon sx={{ fontSize: 32, color: 'primary.main' }} />*/}
        {/*      <Typography variant="h4" component="h1" color="primary.dark" fontWeight={600}>*/}
        {/*        Invoiceable Patients Report*/}
        {/*      </Typography>*/}
        {/*    </Box>*/}
        {/*  </Box>*/}

        {/*  {loading && (*/}
        {/*    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>*/}
        {/*      <CircularProgress />*/}
        {/*    </Box>*/}
        {/*  )}*/}

        {/*  {!loading && reportData && (*/}
        {/*    <Box>*/}
        {/*      {reportData && patientsRows.length > 0 && (*/}
        {/*        <Card sx={{ mb: 4 }}>*/}
        {/*          <CardContent>*/}
        {/*            <Typography variant="h6" sx={{ mb: 3 }}>*/}
        {/*              Invoiceable Patients*/}
        {/*            </Typography>*/}
        {/*            <Box sx={{ height: 800, width: '100%' }}>*/}
        {/*              <DataGrid*/}
        {/*                rows={patientsRows}*/}
        {/*                columns={patientsReportsColumns}*/}
        {/*                initialState={{*/}
        {/*                  pagination: {*/}
        {/*                    paginationModel: { pageSize: 25 },*/}
        {/*                  },*/}
        {/*                }}*/}
        {/*                pageSizeOptions={[25, 50, 100]}*/}
        {/*                rowBuffer={6}*/}
        {/*                sx={{*/}
        {/*                  '& .MuiDataGrid-cell': {*/}
        {/*                    overflow: 'hidden',*/}
        {/*                    textOverflow: 'ellipsis',*/}
        {/*                  },*/}
        {/*                  '& .MuiDataGrid-columnHeaderTitle': {*/}
        {/*                    fontWeight: 600,*/}
        {/*                  },*/}
        {/*                }}*/}
        {/*              />*/}
        {/*            </Box>*/}
        {/*          </CardContent>*/}
        {/*        </Card>*/}
        {/*      )}*/}
        {/*    </Box>*/}
        {/*  )}*/}
      </Box>
    </PageContainer>
  );
}
