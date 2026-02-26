import { BoxProps, FormControl, FormLabel, Stack, TextFieldProps } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTime } from 'luxon';
import { FC } from 'react';
import { Controller, ControllerProps, useFormContext, useWatch } from 'react-hook-form';

type DateRangePickerControllerProps = Pick<ControllerProps, 'name' | 'rules'> &
  Pick<TextFieldProps, 'variant'> &
  Pick<BoxProps, 'sx'> & { label?: string; separator?: string };

export const DateRangePickerController: FC<DateRangePickerControllerProps> = (props) => {
  const { name, rules, label, separator, variant, sx } = props;

  const { control } = useFormContext();

  // Watch both ends of the range so minDate/maxDate constraints update reactively
  const startValue: DateTime | null = useWatch({ control, name: `${name}[0]` }) ?? null;
  const endValue: DateTime | null = useWatch({ control, name: `${name}[1]` }) ?? null;

  return (
    <FormControl>
      {label && <FormLabel sx={{ fontSize: '12px', pb: 0.5 }}>{label}</FormLabel>}
      <LocalizationProvider dateAdapter={AdapterLuxon}>
        <Stack direction="row" alignItems="center" spacing={1} sx={sx}>
          <Controller
            name={`${name}[0]`}
            control={control}
            rules={rules}
            render={({ field: { onChange, value } }) => (
              <DatePicker
                value={value ?? null}
                onChange={onChange}
                format="MM/dd/yyyy"
                maxDate={endValue ?? undefined}
                slotProps={{
                  textField: {
                    style: { width: '100%' },
                    placeholder: 'MM.DD.YYYY',
                    size: 'small',
                    variant,
                  },
                }}
              />
            )}
          />
          <span>{separator || 'to'}</span>
          <Controller
            name={`${name}[1]`}
            control={control}
            rules={rules}
            render={({ field: { onChange, value } }) => (
              <DatePicker
                value={value ?? null}
                onChange={onChange}
                format="MM/dd/yyyy"
                minDate={startValue ?? undefined}
                slotProps={{
                  textField: {
                    style: { width: '100%' },
                    placeholder: 'MM.DD.YYYY',
                    size: 'small',
                    variant,
                  },
                }}
              />
            )}
          />
        </Stack>
      </LocalizationProvider>
    </FormControl>
  );
};
