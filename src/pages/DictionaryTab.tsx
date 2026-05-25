import GenericConfigTab from "../components/GenericConfigTab";
import noDictionaryBanner from "../assets/images/No_Dictionary_Banner.png";

export default function DictionaryTab() {
  return (
    <GenericConfigTab
      title="CUSTOM DICTIONARY"
      description="Add jargon, names, or highly specific terminology so Swaram transcribes them correctly."
      bannerImage={noDictionaryBanner}
      bannerTitle="Start building your custom dictionary!"
      bannerText="Define specific rules to ensure Swaram perfectly transcribes your names, acronyms, and industry jargon."
      isGrid={false}
      f1Key="word"
      f2Key="replacement"
      f1Placeholder="Original Word/Phrase"
      f2Placeholder="Replacement/Correction"
      getCmd="get_dictionary"
      addCmd="add_dictionary_entry"
      updateCmd="update_dictionary_entry"
      deleteCmd="delete_dictionary_entry"
      f2Type="text"
      modalDescription="Define a word and its exact replacement."
    />
  );
}
