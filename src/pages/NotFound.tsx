import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { NotFoundArt } from '@/components/NotFoundArt';
import { usePageTitle } from '@/lib/page';

/** 404: the illustration on one side and a short message with one clear way out on the other, with no card behind them. */
export default function NotFound() {
  usePageTitle('Page not found', undefined, { noindex: true });
  return (
    <section className="nf">
      <div className="nf-stage">
        <NotFoundArt />
        <div className="nf-copy">
          <h1 className="nf-title">Oops!</h1>
          <p className="nf-sub">We can’t find that page you were looking for.</p>
          <Link className="btn btn-primary" to="/"><Icon name="back" size={16} /> Go home</Link>
        </div>
      </div>
    </section>
  );
}
