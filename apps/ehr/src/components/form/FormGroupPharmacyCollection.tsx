import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useOystehrAPIClient } from 'src/features/visits/shared/hooks/useOystehrAPIClient';
import { PharmacyDisplay, PharmacySearch } from 'ui-components';
import {
  PHARMACY_COLLECTION_LINK_IDS,
  PharmacyCollectionAnswerSetInput,
  PlacesResult,
  SearchPlacesInput,
  SearchPlacesOutput,
} from 'utils';

export const FormGroupPharmacyCollection: FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<PlacesResult | null>(null); // todo sarah add logic to populate this is the info is already saved
  const { setValue } = useFormContext();
  const apiClient = useOystehrAPIClient();

  const handleSearchPlaces = async (input: SearchPlacesInput): Promise<SearchPlacesOutput> => {
    if (!apiClient) throw new Error('error searching'); // todo sarah test this
    return await apiClient.searchPlaces(input);
  };

  const clearPharmacyData = (): void => {
    setValue(PHARMACY_COLLECTION_LINK_IDS.erxPharmacyId, undefined);
    setValue(PHARMACY_COLLECTION_LINK_IDS.placesAddress, undefined);
    setValue(PHARMACY_COLLECTION_LINK_IDS.placesId, undefined);
    setValue(PHARMACY_COLLECTION_LINK_IDS.placesName, undefined);
    setValue(PHARMACY_COLLECTION_LINK_IDS.placesDataSaved, false, { shouldDirty: true });
  };

  const handlePharmacySelection = (input: PharmacyCollectionAnswerSetInput): void => {
    setValue(PHARMACY_COLLECTION_LINK_IDS.erxPharmacyId, input.erxPharmacyId);
    setValue(PHARMACY_COLLECTION_LINK_IDS.placesAddress, input.placesAddress);
    setValue(PHARMACY_COLLECTION_LINK_IDS.placesId, input.placesId);
    setValue(PHARMACY_COLLECTION_LINK_IDS.placesName, input.placesName);
    setValue(PHARMACY_COLLECTION_LINK_IDS.placesDataSaved, true, { shouldDirty: true });
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
