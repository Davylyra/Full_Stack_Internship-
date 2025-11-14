const { useState, useEffect } = React;

// Admin Login Component
function AdminLogin({ onLogin }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost/feedback_system/admin_api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'login',
                    password: password
                }),
            });

            const result = await response.json();

            if (result.success) {
                onLogin();
            } else {
                setError(result.message || 'Invalid password');
            }
        } catch (error) {
            console.error('Login Error:', error);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-container">
            <div className="admin-login-box">
                <h2>Admin Login</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="admin-password">Password</label>
                        <input
                            type="password"
                            id="admin-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter admin password"
                            required
                        />
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Admin Dashboard Component
function AdminDashboard({ onLogout }) {
    const [feedback, setFeedback] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterType, setFilterType] = useState('');
    const [total, setTotal] = useState(0);

    const fetchFeedback = async (type = '') => {
        setLoading(true);
        setError('');

        try {
            const url = `http://localhost/feedback_system/admin_api.php${type ? `?type=${type}` : ''}`;
            const response = await fetch(url);

            if (response.status === 401) {
                onLogout();
                return;
            }

            const result = await response.json();

            if (result.success) {
                setFeedback(result.data);
                setStats(result.stats || {});
                setTotal(result.total || 0);
            } else {
                setError(result.message || 'Failed to fetch feedback');
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            setError('An error occurred while fetching feedback.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedback(filterType);
    }, [filterType]);

    const handleLogout = async () => {
        try {
            await fetch('http://localhost/feedback_system/admin_api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'logout' })
            });
        } catch (error) {
            console.error('Logout Error:', error);
        }
        onLogout();
    };

    const formatDate = (dateString) => {
        if (!dateString || dateString === 'N/A') {
            return 'N/A';
        }
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch (e) {
            return dateString;
        }
    };

    const getSentimentEmoji = (sentiment) => {
        const emojis = {
            'positive': '😊',
            'neutral': '😐',
            'negative': '😠'
        };
        return emojis[sentiment] || '';
    };

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <h1>Admin Dashboard</h1>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>

            {/* Statistics */}
            <div className="stats-container">
                <div className="stat-card">
                    <div className="stat-value">{total}</div>
                    <div className="stat-label">Total Feedback</div>
                </div>
                {Object.entries(stats).map(([type, data]) => (
                    <div key={type} className="stat-card">
                        <div className="stat-value">{data.count}</div>
                        <div className="stat-label">{type.toUpperCase()}</div>
                        {data.avg_score && (
                            <div className="stat-subvalue">Avg: {parseFloat(data.avg_score).toFixed(1)}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="filter-container">
                <label>Filter by Type:</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="nps">NPS</option>
                    <option value="review">Review</option>
                    <option value="sentiment">Sentiment</option>
                </select>
                <button className="refresh-btn" onClick={() => fetchFeedback(filterType)}>Refresh</button>
            </div>

            {/* Feedback List */}
            {loading ? (
                <div className="loading-message">Loading feedback...</div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : feedback.length === 0 ? (
                <div className="no-data-message">No feedback found.</div>
            ) : (
                <div className="feedback-table-container">
                    <table className="feedback-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Type</th>
                                <th>Score</th>
                                <th>Sentiment</th>
                                <th>Product ID</th>
                                <th>Comment</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feedback.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td><span className="type-badge">{item.feedback_type}</span></td>
                                    <td>{item.score !== null ? item.score : '-'}</td>
                                    <td>
                                        {item.sentiment ? (
                                            <span className="sentiment-badge">
                                                {getSentimentEmoji(item.sentiment)} {item.sentiment}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td>{item.product_id || '-'}</td>
                                    <td className="comment-cell">
                                        {item.comment ? (
                                            <span title={item.comment}>
                                                {item.comment.length > 50
                                                    ? item.comment.substring(0, 50) + '...'
                                                    : item.comment}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td>{formatDate(item.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Feedback System Component (existing)
function FeedbackSystem() {
    const [activeTab, setActiveTab] = useState('nps');
    const [npsScore, setNpsScore] = useState(null);
    const [npsComment, setNpsComment] = useState('');
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [productId, setProductId] = useState('');
    const [sentiment, setSentiment] = useState(null);
    const [sentimentComment, setSentimentComment] = useState('');

    const [submitted, setSubmitted] = useState(false);

    // General submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(false);

        let data = { feedback_type: activeTab };
        let valid = false;

        if (activeTab === 'nps') {
            if (npsScore === null) {
                alert('Please select an NPS score.');
                return;
            }
            data = { ...data, score: npsScore, comment: npsComment };
            valid = true;
        } else if (activeTab === 'review') {
            if (reviewRating === 0) {
                alert('Please select a star rating.');
                return;
            }
            if (!productId) {
                alert('Please enter a Product ID.');
                return;
            }
            data = { ...data, score: reviewRating, comment: reviewComment, product_id: productId };
            valid = true;
        } else if (activeTab === 'sentiment') {
            if (!sentiment) {
                alert('Please select a sentiment.');
                return;
            }
            data = { ...data, sentiment: sentiment, comment: sentimentComment };
            valid = true;
        }

        if (valid) {
            try {
                const response = await fetch('http://localhost/feedback_system/feedback.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (result.success) {
                    setSubmitted(true);
                    // Reset forms
                    setNpsScore(null);
                    setNpsComment('');
                    setReviewRating(0);
                    setReviewComment('');
                    setProductId('');
                    setSentiment(null);
                    setSentimentComment('');
                } else {
                    alert('Error submitting feedback: ' + result.message);
                }
            } catch (error) {
                console.error('Fetch Error:', error);
                alert('An error occurred. Please check the console.');
            }
        }
    };

    if (submitted) {
        return (
            <div className="feedback-container">
                <div className="thank-you-message">
                    <h3>Thank you for your feedback!</h3>
                    <button className="submit-btn" onClick={() => setSubmitted(false)}>
                        Submit More
                    </button>
                </div>
            </div>
        );
    }

    // NPS Score buttons
    const npsButtons = [...Array(11).keys()].map(num => (
        <button
            key={num}
            type="button"
            className={`nps-btn ${npsScore === num ? 'active' : ''}`}
            onClick={() => setNpsScore(num)}
        >
            {num}
        </button>
    ));

    // Star rating buttons
    const starButtons = [...Array(5).keys()].map(num => (
        <button
            key={num}
            type="button"
            className={`star-btn ${reviewRating >= num + 1 ? 'active' : ''}`}
            onClick={() => setReviewRating(num + 1)}
        >
            &#9733;
        </button>
    ));

    return (
        <div className="feedback-container">
            <div className="tabs">
                <button
                    className={`tab-button ${activeTab === 'nps' ? 'active' : ''}`}
                    onClick={() => setActiveTab('nps')}
                >
                    NPS Survey
                </button>
                <button
                    className={`tab-button ${activeTab === 'review' ? 'active' : ''}`}
                    onClick={() => setActiveTab('review')}
                >
                    Product Review
                </button>
                <button
                    className={`tab-button ${activeTab === 'sentiment' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sentiment')}
                >
                    User Sentiment
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {/* NPS Form */}
                <div className={`form-section ${activeTab === 'nps' ? 'active' : ''}`}>
                    <div className="form-group">
                        <label>How likely are you to recommend us to a friend?</label>
                        <div className="nps-scores">{npsButtons}</div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="nps-comment">Comments (Optional)</label>
                        <textarea
                            id="nps-comment"
                            value={npsComment}
                            onChange={(e) => setNpsComment(e.target.value)}
                            placeholder="What's the main reason for your score?"
                        ></textarea>
                    </div>
                </div>

                {/* Product Review Form */}
                <div className={`form-section ${activeTab === 'review' ? 'active' : ''}`}>
                    <div className="form-group">
                        <label htmlFor="product-id">Product ID or Name</label>
                        <input
                            type="text"
                            id="product-id"
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            placeholder="e.g., 'SKU-12345' or 'Men's T-Shirt'"
                        />
                    </div>
                    <div className="form-group">
                        <label>Your Rating</label>
                        <div className="star-rating">{starButtons}</div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="review-comment">Your Review</label>
                        <textarea
                            id="review-comment"
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="What did you like or dislike?"
                        ></textarea>
                    </div>
                </div>

                {/* Sentiment Form */}
                <div className={`form-section ${activeTab === 'sentiment' ? 'active' : ''}`}>
                    <div className="form-group">
                        <label>How are you feeling about our service?</label>
                        <div className="sentiment-buttons">
                            <button
                                type="button"
                                className={`sentiment-btn ${sentiment === 'positive' ? 'active' : ''}`}
                                onClick={() => setSentiment('positive')}
                            >
                                😊
                            </button>
                            <button
                                type="button"
                                className={`sentiment-btn ${sentiment === 'neutral' ? 'active' : ''}`}
                                onClick={() => setSentiment('neutral')}
                            >
                                😐
                            </button>
                            <button
                                type="button"
                                className={`sentiment-btn ${sentiment === 'negative' ? 'active' : ''}`}
                                onClick={() => setSentiment('negative')}
                            >
                                😠
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="sentiment-comment">Tell us more (Optional)</label>
                        <textarea
                            id="sentiment-comment"
                            value={sentimentComment}
                            onChange={(e) => setSentimentComment(e.target.value)}
                            placeholder="Please share your thoughts..."
                        ></textarea>
                    </div>
                </div>

                <button type="submit" className="submit-btn">
                    Submit Feedback
                </button>
            </form>
        </div>
    );
}

// Main App Component
function App() {
    const [view, setView] = useState('feedback'); // 'feedback' or 'admin'
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const handleAdminLogin = () => {
        setIsAuthenticated(true);
        setView('admin');
    };

    const handleAdminLogout = () => {
        setIsAuthenticated(false);
        setView('feedback');
    };

    return (
        <div>
            {/* Navigation */}
            <div className="main-navigation">
                <button
                    className={`nav-btn ${view === 'feedback' ? 'active' : ''}`}
                    onClick={() => setView('feedback')}
                >
                    Feedback Form
                </button>
                <button
                    className={`nav-btn ${view === 'admin' ? 'active' : ''}`}
                    onClick={() => {
                        if (isAuthenticated) {
                            setView('admin');
                        } else {
                            setView('admin-login');
                        }
                    }}
                >
                    Admin Dashboard
                </button>
            </div>

            {/* Content */}
            {view === 'feedback' && <FeedbackSystem />}
            {view === 'admin-login' && <AdminLogin onLogin={handleAdminLogin} />}
            {view === 'admin' && isAuthenticated && <AdminDashboard onLogout={handleAdminLogout} />}
        </div>
    );
}

const domContainer = document.querySelector('#root');
const root = ReactDOM.createRoot(domContainer);
root.render(<App />);
