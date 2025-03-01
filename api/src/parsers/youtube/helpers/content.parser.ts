import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { URLS } from 'src/common/constants/urls';
import { ConvertUtil } from 'src/common/utils/convert.util';
import { SongTypes } from 'src/modules/v1/song/types/song.types';
import { Client } from 'youtubei';
import { TrendingParseResult } from '../types/youtube.api.types';
import { REGEXP } from 'src/common/constants/regexp';
import { apiEnv } from 'src/api/options/api.env';

@Injectable()
export class ContentParser {
  private client: Client = new Client();

  constructor(@Inject(ConvertUtil) private convertion: ConvertUtil) {}

  public async getTrendingSongs(
    regionCode: string,
    limit,
  ): Promise<SongTypes[]> {
    try {
      const response = await axios.get<TrendingParseResult>(
        `${URLS.YOUTUBE_API}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&videoCategoryId=10&regionCode=${regionCode}&maxResults=${limit}&key=${apiEnv.env.YOUTUBE_API_KEY}`,
      );

      return this.formatData(response.data);
    } catch {
      throw new ServiceUnavailableException(
        'Service unavialable, please try later',
      );
    }
  }

  private formatData(data: TrendingParseResult): SongTypes[] {
    return data.items.map((item) => {
      const { artist, author, title } = this.exctractNamesFromTitle(
        item.snippet.title,
        item.snippet.channelTitle,
      );

      return {
        songId: item.id,
        artist,
        author,
        title,
        originalTitle: item.snippet.title,
        duration: this.convertion.convertIsoDuration(
          item.contentDetails.duration,
        ),
        isDownloading: false,
        isOfficial: false,
        uploadDate: item.snippet.publishedAt,
      };
    });
  }

  private exctractNamesFromTitle(title: string, author: string | null) {
    const clearedOrirignalTitle = REGEXP.CLEAT_TITLE.reduce(
      (acc, regex) => acc.replace(regex, ''),
      title,
    ).split('-');

    return {
      author,
      title: clearedOrirignalTitle[1]?.trim() || null,
      artist: clearedOrirignalTitle[1]
        ? clearedOrirignalTitle[0]?.trim()
        : null,
    };
  }
}
