import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { VideoRemovalNoticesComponent } from './video-removal-notices.component';
import { RecordsService } from '../../services/records.service';
import { ApiService } from '../../services/api.service';
import { HealthRecord } from '../../models/records.models';
import { saveFromSignedLink } from '../../services/signed-link';

const DAY = 86_400_000;
const local = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
};

function video(id: number, removalInDays: number, extra: Partial<HealthRecord> = {}): HealthRecord {
  return {
    id, userId: 7, category: 'SCAN', originalFileName: `video-${id}.mp4`, mimeType: 'video/mp4', sizeBytes: 1,
    status: 'UPLOADED', scanStatus: 'CLEAN', available: true, kind: 'VIDEO', createdAt: '', updatedAt: '',
    removalAt: local(new Date(Date.now() + removalInDays * DAY)), ...extra
  };
}

describe('VideoRemovalNoticesComponent', () => {
  let fixture: ComponentFixture<VideoRemovalNoticesComponent>;
  let records: jasmine.SpyObj<RecordsService>;

  beforeEach(() => {
    records = jasmine.createSpyObj<RecordsService>('RecordsService', ['getRecords', 'getDownloadUrl']);
    records.getRecords.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [VideoRemovalNoticesComponent],
      providers: [
        { provide: RecordsService, useValue: records },
        { provide: ApiService, useValue: { showToast: jasmine.createSpy('showToast') } }
      ]
    });
    fixture = TestBed.createComponent(VideoRemovalNoticesComponent);
  });

  function render(list: HealthRecord[] | null) {
    fixture.componentRef.setInput('records', list);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('warns only for videos in their last 7 days, soonest first', () => {
    const el = render([video(1, 10), video(2, 6.5), video(3, 0.5), video(4, 3, { kind: 'DOCUMENT', mimeType: 'application/pdf' })]);
    const notices = el.querySelectorAll('.notice');
    expect(notices.length).toBe(2);
    expect(notices[0].textContent).toContain('video-3.mp4');
    expect(notices[0].textContent).toContain('Last day to download');
    expect(notices[1].textContent).toContain('7 days left');
    expect(notices[0].querySelector('strong')!.textContent).toMatch(/^This video will be removed on \d{1,2} \w{3} \d{4}\. Download it now\.$/);
  });

  it('downloads through a short-lived attachment link', () => {
    records.getDownloadUrl.and.returnValue(of({ downloadUrl: 'https://storage.test/v?sig', expiresAt: '' }));
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    const el = render([video(5, 2)]);
    (el.querySelector('button') as HTMLButtonElement).click();
    expect(records.getDownloadUrl).toHaveBeenCalledWith(5, 'attachment');
    expect(click).toHaveBeenCalled();
  });

  it('keeps the button off while the video is still being checked', () => {
    const el = render([video(6, 2, { available: false, scanStatus: 'PENDING' })]);
    expect((el.querySelector('button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('loads the records itself when the page doesn\'t pass them (My Journey)', () => {
    records.getRecords.and.returnValue(of([video(7, 1)]));
    const el = render(null);
    expect(records.getRecords).toHaveBeenCalled();
    expect(el.querySelectorAll('.notice').length).toBe(1);
  });
});

describe('saveFromSignedLink', () => {
  it('follows the link with a temporary anchor (no popup, so phones allow it) and removes it', () => {
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    const before = document.querySelectorAll('a').length;
    saveFromSignedLink('https://storage.test/file?sig');
    expect(click).toHaveBeenCalledTimes(1);
    const a = click.calls.mostRecent().object as HTMLAnchorElement;
    expect(a.href).toBe('https://storage.test/file?sig');
    expect(a.rel).toBe('noopener');
    expect(document.querySelectorAll('a').length).toBe(before);
  });
});
