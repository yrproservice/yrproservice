import React, { useState } from 'react';

const TYPE_LABELS = {
  service: 'Service Request',
  quotation: 'Quotation Request',
  dental_chair: 'Dental Chair Request',
};

const STATUS_LABELS = {
  received: 'Received',
  in_review: 'In Review',
  contacted: 'Customer Contacted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_HELP = {
  received: 'Your request has been received and is awaiting review.',
  in_review: 'The YR Proservice team is reviewing your request.',
  contacted: 'The team has marked that contact has been made about your request.',
  completed: 'This request has been marked as completed.',
  cancelled: 'This request has been marked as cancelled. Contact YR Proservice if you need clarification.',
};

export default function TrackRequest() {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setRequest(null);

    try {
      const params = new URLSearchParams({ reference: reference.trim(), email: email.trim() });
      const response = await fetch(`/api/track?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok || !result.request) {
        throw new Error(result.error || 'We could not check this request. Please try again.');
      }
      setRequest(result.request);
    } catch (lookupError) {
      setError(lookupError.message || 'Unable to reach the tracking service. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return <section className="page-section track-request-page">
    <div className="container track-request-container">
      <div className="track-request-intro">
        <p className="eyebrow">Request Tracking</p>
        <h1>Check your request status.</h1>
        <p className="lead">Enter the reference number shown after submission and the email address you used. For privacy, both details must match our records.</p>
      </div>
      <form className="form track-request-form" onSubmit={handleSubmit}>
        <label>Request Reference
          <input required name="reference" value={reference} onChange={event => setReference(event.target.value)} maxLength={40} autoCapitalize="characters" autoComplete="off" placeholder="e.g. YRQ-20261022-ABC123" />
        </label>
        <label>Email Address Used for the Request
          <input required type="email" name="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="name@example.com" />
        </label>
        {error && <p className="track-request-error" role="alert" aria-live="polite">{error}</p>}
        <button className="button" type="submit" disabled={loading}>{loading ? 'Checking Status…' : 'Check Request Status'}</button>
      </form>

      {request && <section className="track-result" aria-live="polite" aria-label="Request status result">
        <p className="eyebrow">Request Found</p>
        <h2>{STATUS_LABELS[request.status] || 'Status Updated'}</h2>
        <p>{STATUS_HELP[request.status] || 'Please contact YR Proservice if you need more information.'}</p>
        <dl className="track-result-details">
          <div><dt>Reference</dt><dd>{request.reference}</dd></div>
          <div><dt>Request Type</dt><dd>{TYPE_LABELS[request.requestType] || 'Customer Request'}</dd></div>
          <div><dt>Date Submitted</dt><dd>{request.createdAt ? new Date(request.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available'}</dd></div>
        </dl>
      </section>}
      <p className="track-request-help">Need help? Call <a href="tel:+601116080623">011-1608 0623</a> or email <a href="mailto:yr.proservice@gmail.com">yr.proservice@gmail.com</a>.</p>
    </div>
  </section>;
}
