package channels

import (
	"reflect"
	"testing"
)

func TestParseChatIDs(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    []int64
		wantErr bool
	}{
		{
			name:    "single ID",
			input:   "123456",
			want:    []int64{123456},
			wantErr: false,
		},
		{
			name:    "multiple IDs",
			input:   "123456,789012",
			want:    []int64{123456, 789012},
			wantErr: false,
		},
		{
			name:    "multiple IDs with spaces",
			input:   " 123456 , 789012 ",
			want:    []int64{123456, 789012},
			wantErr: false,
		},
		{
			name:    "empty input",
			input:   "",
			want:    nil,
			wantErr: true,
		},
		{
			name:    "comma only",
			input:   ",",
			want:    nil,
			wantErr: true,
		},
		{
			name:    "invalid ID",
			input:   "123,abc",
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseChatIDs(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("parseChatIDs() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("parseChatIDs() got = %v, want %v", got, tt.want)
			}
		})
	}
}
