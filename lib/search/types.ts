export interface ISearchData {
  url: string;
  title: string;
  text: string;
}

export interface ISuggestionItem {
  id: string;
  title: string;
  url: string;
  text: string;
}

export interface ISuggestionsResponse {
  success: boolean;
  data: ISuggestionItem[];
  error?: string;
}
