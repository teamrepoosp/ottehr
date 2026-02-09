import { QuestionnaireResponseItem } from 'fhir/r4b';
import { FC, useEffect, useState } from 'react';
import api from 'src/api/ottehrApi';
import { useUCZambdaClient } from 'src/hooks/useUCZambdaClient';
import { PharmacyDisplay, PharmacySearch } from 'ui-components';
import {
  clearPharmacyCollectionAnswerSet,
  makePharmacyCollectionAnswerSetForQR,
  PHARMACY_COLLECTION_LINK_IDS,
  PharmacyCollectionAnswerSetInput,
  PlacesResult,
  SearchPlacesInput,
  SearchPlacesOutput,
} from 'utils';
import { useQRState } from '../useFormHelpers';

export interface PharmacyCollectionProps {
  onChange: (e: any) => void;
}

export const PharmacyCollection: FC<PharmacyCollectionProps> = (props: PharmacyCollectionProps) => {
  const { onChange } = props;
  const [selectedPlace, setSelectedPlace] = useState<PlacesResult | null>(null);
  const { formValues } = useQRState();

  const zambdaClient = useUCZambdaClient({ tokenless: false });

  const pharmacyCollectionItemValues = formValues[PHARMACY_COLLECTION_LINK_IDS.pharmacyCollection]?.item;

  useEffect(() => {
    if (!pharmacyCollectionItemValues?.length) return;

    type PreviousPharmData = {
      pharmName?: string;
      pharmAddress?: string;
      pharmPlacesId?: string;
      pharmDsId?: string;
      hasAnyData: boolean;
    };

    const existing = pharmacyCollectionItemValues?.reduce(
      (acc: PreviousPharmData, item: QuestionnaireResponseItem) => {
        const answer = item.answer?.[0]?.valueString;
        if (!answer) return acc;

        acc.hasAnyData = true;

        switch (item.linkId) {
          case PHARMACY_COLLECTION_LINK_IDS.placesId:
            acc.pharmPlacesId = answer;
            break;
          case PHARMACY_COLLECTION_LINK_IDS.placesName:
            acc.pharmName = answer;
            break;
          case PHARMACY_COLLECTION_LINK_IDS.placesAddress:
            acc.pharmAddress = answer;
            break;
          case PHARMACY_COLLECTION_LINK_IDS.erxPharmacyId:
            acc.pharmDsId = answer;
            break;
        }

        return acc;
      },
      { hasAnyData: false }
    );

    if (existing.hasAnyData) {
      setSelectedPlace({
        name: existing.pharmName ?? '',
        address: existing.pharmAddress ?? '',
        placesId: existing.pharmPlacesId ?? '',
      });
    }
  }, [pharmacyCollectionItemValues]);

  const handleSearchPlaces = async (input: SearchPlacesInput): Promise<SearchPlacesOutput> => {
    if (!zambdaClient) throw new Error('error searching'); // todo sarah test this
    return await api.searchPlaces(input, zambdaClient);
  };

  const clearPharmacyData = (): void => {
    const answerSet = clearPharmacyCollectionAnswerSet();
    onChange(answerSet);
  };

  const handlePharmacySelection = (input: PharmacyCollectionAnswerSetInput): void => {
    const answerSet = makePharmacyCollectionAnswerSetForQR(input);
    onChange(answerSet);
  };

  return selectedPlace ? (
    <PharmacyDisplay
      selectedPlace={selectedPlace}
      setSelectedPlace={setSelectedPlace}
      clearPharmacyData={clearPharmacyData}
    ></PharmacyDisplay>
  ) : (
    <PharmacySearch
      handlePharmacySelection={handlePharmacySelection}
      setSelectedPlace={setSelectedPlace}
      searchPlaces={handleSearchPlaces}
    ></PharmacySearch>
  );
};
