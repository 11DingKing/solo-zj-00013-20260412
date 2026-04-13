import type { NextApiRequest, NextApiResponse } from 'next';
import database from '../../../lib/search/database.json';
import { ISuggestionsResponse, ISuggestionItem } from '../../../lib/search/types';

function sanitizeInput(input: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#47;',
  };
  return input.replace(/[&<>"'\/]/g, (char) => htmlEntities[char] || char);
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface IApiSuggestionsRequest extends NextApiRequest {
  query: { q?: string };
}

export default function handler(
  req: IApiSuggestionsRequest,
  res: NextApiResponse<ISuggestionsResponse>
) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        data: [],
        error: 'Method not allowed',
      });
    }

    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const sanitizedQuery = sanitizeInput(q.trim());

    if (sanitizedQuery.length < 1) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const searchPattern = new RegExp(escapeRegExp(sanitizedQuery), 'i');

    const suggestions: ISuggestionItem[] = database
      .filter((result) => {
        return (
          searchPattern.test(result.title) || searchPattern.test(result.text)
        );
      })
      .slice(0, 10)
      .map((result, index) => ({
        id: `suggestion-${index}`,
        title: result.title,
        url: result.url,
        text: result.text,
      }));

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Suggestions API error:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: 'Internal server error',
    });
  }
}
